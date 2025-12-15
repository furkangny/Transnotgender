/*
 * Profile Service - Main Entry Point
 * Manages user profile data and avatars
 */
import fastify from 'fastify';
import dotenv from 'dotenv';
import sqlitePlugin from './plugins/sqlite-plugin.js'
import memberEndpoints from './routes/memberEndpoints.js';
import { initMemberTable } from './database/initMemberTable.js';
import rabbitmqPlugin from './plugins/rabbitmq-plugin.js';
import { insertMember, removeMember, locateMemberById, modifyMemberEmailById, modifyRankById } from './models/memberRepository.js';
import redisPlugin from './plugins/redis-plugin.js';
import multipart from '@fastify/multipart'
import { downloadAvatarUrl } from './utils/helpers.js';
import websocket from "@fastify/websocket";

// Load environment variables
dotenv.config();

// Initialize Fastify app
const app = fastify({ logger: true });

// Configure file upload limits
await app.register(multipart, {
    limits: {
        fileSize: 25000000,
        files: 1
    }
});

// Register plugins
await app.register(sqlitePlugin);
await app.register(rabbitmqPlugin);
await app.register(websocket);

// Initialize database
await initMemberTable(app.db);

// Register routes
await app.register(memberEndpoints, { prefix: '/profile' });

// Register Redis after routes
await app.register(redisPlugin);

console.log("profile service initialization is done...");

// Message queue consumer for profile operations
app.rabbit.consumeMessages(async (incomingMsg) => {
    console.log("Body received from profile:", incomingMsg);
    
    const userExists = await app.redis.sIsMember('userIds', `${incomingMsg.userId}`);
    console.log('idExist value: ', userExists);
    
    if (!userExists) return;
    
    const msgType = incomingMsg.type;
    const targetUserId = incomingMsg.userId;
    
    if (msgType === 'UPDATE') {
        const { email: newEmail } = incomingMsg;
        await modifyMemberEmailById(app.db, targetUserId, newEmail);
        
    } else if (msgType === 'INSERT') {
        let profileAvatar = null;
        const { username, email, avatar_url, gender } = incomingMsg;
        
        if (avatar_url) {
            profileAvatar = await downloadAvatarUrl(avatar_url, targetUserId);
        }
        
        await insertMember(app.db, targetUserId, username, email, profileAvatar, gender);
        const memberProfile = await locateMemberById(app.db, targetUserId);
        
        await app.redis.sendCommand([
            'JSON.SET',
            `player:${targetUserId}`,
            '$',
            JSON.stringify(memberProfile)
        ]);
        
    } else if (msgType === 'DELETE') {
        await removeMember(app.db, targetUserId);
        await app.redis.sendCommand([
            'JSON.DEL',
            `player:${targetUserId}`,
            '$'
        ]);
        
    } else if (msgType === 'UPDATE_RANK') {
        const { rank: newRank } = incomingMsg;
        await modifyRankById(app.db, targetUserId, newRank);
        
        const updatedMember = await locateMemberById(app.db, targetUserId);
        await app.redis.sendCommand([
            'JSON.SET',
            `player:${targetUserId}`,
            '$',
            JSON.stringify(updatedMember)
        ]);
        console.log("Updated rank successfully");
    }
});

// Bootstrap server
const bootstrap = async () => {
    try {
        const hostAddress = process.env.HOST_NAME;
        const portNumber = 3001;
        await app.listen({ host: hostAddress, port: portNumber });
        app.log.info("Server is listening on port 3001");
    } catch (err) {
        app.log.error(err);
        await app.redis.close();
        await app.db.close();
        await app.rabbit.close();
        await app.close();
        process.exit(1);
    }
};

bootstrap();

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    try {
        console.log(`Caught a signal or type ${signal}`);
        await app.redis.close();
        await app.db.close();
        await app.rabbit.close();
        await app.close();
        process.exit(0);
    } catch (err) {
        console.log(err);
        process.exit(0);
    }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
