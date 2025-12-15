/*
 * Chat Service - Main Entry Point
 * Real-time messaging via WebSocket
 */
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { initConversationTable } from './database/setupChatStorage.js';
import EventBusClient from './libs/messageQueue.js';
import { WebSocketServer, WebSocket } from 'ws';
import { validateToken } from './middleware/tokenGuard.js';
import dotenv from 'dotenv';
import {
    insertChatEntry,
    removeEntries,
    fetchAllEntries,
    fetchEntryById,
    setEntryAsReceived,
    setEntryAsViewed
} from './database/conversationRepository.js';
import { createClient } from 'redis';

// Load environment configuration
dotenv.config();

// Database connection
let dbConn;

(async () => {
    try {
        dbConn = await open({
            filename: './messages.db.sqlite',
            driver: sqlite3.Database
        });
        console.log('Database connected.');
        await initConversationTable(dbConn);
    } catch (err) {
        console.error('Failed to connect to database or create table:', err);
        process.exit(1);
    }
})();

// Redis connection
let redisClient;

(async () => {
    try {
        redisClient = await createClient({
            url: 'redis://redis:6379'
        })
            .on("error", (err) => console.log("Redis Client Error", err))
            .connect();
        console.log('Redis is connected...', redisClient);
    } catch (err) {
        console.error('Failed to connect redis-server:', err);
        process.exit(1);
    }
})();

// Connected users map
const connectedUsers = new Map();

// WebSocket server configuration
const wsServer = new WebSocketServer({ port: 3004, maxPayload: 25000000 });

// Event bus for inter-service communication
const messageBus = new EventBusClient(process.env.RABBITMQ_CHAT_QUEUE);
await messageBus.connect();

// Handle new WebSocket connections
wsServer.on('connection', async (socket, request) => {
    console.log('WebSocket: Client connected.');
    socket.isAuthenticated = false;
    socket.userId = null;
    
    await validateToken(socket, request, redisClient);
    
    if (socket.userId) {
        if (!connectedUsers.has(socket.userId)) {
            connectedUsers.set(socket.userId, new Set());
        }
        connectedUsers.get(socket.userId).add(socket);
        
        // Send pending messages
        const pendingMessages = await fetchAllEntries(dbConn, socket.userId);
        if (pendingMessages && socket.readyState === WebSocket.OPEN) {
            for (const msg of pendingMessages) {
                socket.send(JSON.stringify(msg));
            }
        }
    } else {
        socket.close(3000, 'Unauthorized');
        return;
    }

    // Handle incoming messages
    socket.on('message', async (rawMessage) => {
        if (!socket.isAuthenticated) {
            socket.close(3000, 'Unauthorized');
            return;
        }
        
        const msgPayload = JSON.parse(rawMessage);
        
        if (msgPayload.type === 'MESSAGE_SENT') {
            console.log('WebSocket: payload received: ', msgPayload);
            const recipientId = msgPayload.recipient_id;
            console.log('WebSocket: recipient: ', recipientId);

            const userExists = await redisClient.sIsMember('userIds', `${recipientId}`);
            console.log('idExist value: ', userExists);
            
            if (!userExists) return;
            
            if (recipientId) {
                let isUserBlocked = await redisClient.sIsMember(`blocker:${socket.userId}`, `${recipientId}`);
                if (!isUserBlocked) {
                    isUserBlocked = await redisClient.sIsMember(`blocker${recipientId}`, `${socket.userId}`);
                }
                
                if (recipientId === msgPayload.sender_id || recipientId === socket.userId || isUserBlocked) {
                    return;
                }

                const newMessageId = await insertChatEntry(dbConn, msgPayload);
                msgPayload.message_id = newMessageId;

                messageBus.publishEvent({
                    type: 'MESSAGE_RECEIVED',
                    recipient_id: msgPayload.recipient_id,
                    sender_id: socket.userId
                }, 'notifications.message.received');

                const recipientSockets = connectedUsers.get(recipientId);
                if (recipientSockets) {
                    for (const conn of recipientSockets) {
                        if (conn.isAuthenticated && conn.readyState === WebSocket.OPEN) {
                            conn.send(JSON.stringify(msgPayload));
                        }
                    }
                    await setEntryAsReceived(dbConn, newMessageId);
                }
            }
        } else if (msgPayload.type === 'MESSAGE_READ') {
            console.log('WebSocket: payload received: ', msgPayload);
            if (msgPayload.message_id) {
                const existingMsg = await fetchEntryById(dbConn, msgPayload.message_id);
                if (!existingMsg) return;
                await setEntryAsViewed(dbConn, existingMsg.id);
            }
        }
    });

    socket.on('error', (err) => {
        console.error('WebSocket: Client error:', err);
    });

    socket.on('close', () => {
        console.log('WebSocket: Client disconnected.');
        if (socket.isAuthenticated && connectedUsers.has(socket.userId)) {
            connectedUsers.get(socket.userId).delete(socket);
            if (connectedUsers.get(socket.userId).size === 0) {
                connectedUsers.delete(socket.userId);
            }
        }
    });
});

wsServer.on('error', (err) => {
    console.error('WebSocket: Server error:', err);
    process.exit(1);
});

// Subscribe to user deletion events
messageBus.subscribeToEvents(async (incomingMsg) => {
    if (incomingMsg.type === 'DELETE') {
        const targetUserId = incomingMsg.userId;

        const userExists = await redisClient.sIsMember('userIds', `${targetUserId}`);
        console.log('idExist value: ', userExists);
        
        if (!userExists) return;
        
        await removeEntries(dbConn, targetUserId);
        connectedUsers.get(targetUserId)?.forEach((socket) => {
            socket.close(1010, 'Mandatory exit');
        });
    }
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    try {
        console.log(`Caught a signal or type ${signal}`);
        await messageBus.close();
        await dbConn.close();
        await redisClient.close();
        process.exit(0);
    } catch (err) {
        console.log(err);
        process.exit(0);
    }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
