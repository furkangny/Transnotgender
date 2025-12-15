/*
 * Notifications Service - Main Entry Point
 * Real-time notifications via WebSocket
 */
import { setupNotificationDB } from "./database/setupNotificationDB.js";
import EventBusClient from "./libs/EventBusClient.js";
import { WebSocketServer, WebSocket } from "ws";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import { open } from "sqlite";
import {
  insertNotification,
  removeFriendRequestNotification,
  removeNotifications,
  locateNotification,
  fetchAllNotifications,
  setAsDelivered,
  setAsRead,
  fetchUnreadCount,
} from "./database/notificationRepository.js";
import { validateToken } from "./middleware/tokenGuard.js";
import { createClient } from "redis";

// Load environment configuration
dotenv.config();

// Database connection
let dbConn;

(async () => {
  try {
    dbConn = await open({
      filename: "./notifications.db.sqlite",
      driver: sqlite3.Database,
    });
    console.log("Database connected.");
    await setupNotificationDB(dbConn);
  } catch (err) {
    console.error("Failed to connect to database or create table:", err);
    process.exit(1);
  }
})();

// Redis connection
let redisClient;

(async () => {
  try {
    redisClient = await createClient({
      url: "redis://redis:6379",
    })
      .on("error", (err) => console.log("Redis Client Error", err))
      .connect();
    console.log("Redis is connected...", redisClient);
  } catch (err) {
    console.error("Failed to connect redis-server:", err);
    process.exit(1);
  }
})();

// Connected users map
const connectedUsers = new Map();

// WebSocket server configuration
const wsServer = new WebSocketServer({ port: 3003, maxPayload: 1000000 });

// Event bus for inter-service communication
const notificationBus = new EventBusClient(process.env.RABBITMQ_NOTIFICATION_QUEUE);
await notificationBus.connect();

// Handle new WebSocket connections
wsServer.on("connection", async (socket, request) => {
  console.log("WebSocket: Client connected.");
  await validateToken(socket, request, redisClient);
  
  if (socket.isAuthenticated) {
    if (!connectedUsers.has(socket.userId)) {
      connectedUsers.set(socket.userId, new Set());
    }
    connectedUsers.get(socket.userId).add(socket);

    // Fetch and send all unread notifications
    const userNotifications = await fetchAllNotifications(dbConn, socket.userId);
    const { count: unreadCount, ids: unreadIds } = await fetchUnreadCount(dbConn, socket.userId);

    if (userNotifications && socket.readyState === WebSocket.OPEN) {
      // Send unread count first
      socket.send(
        JSON.stringify({
          type: "UNREAD_COUNT",
          count: unreadCount,
          notification_ids: unreadIds,
        })
      );

      // Send notifications one by one
      for (const notif of userNotifications) {
        console.log("On connection notification: ", notif);
        socket.send(JSON.stringify(notif));
      }
    }
  } else {
    socket.close(3000, "Unauthorized");
    return;
  }

  // Handle incoming messages
  socket.on("message", async (rawMessage) => {
    if (!socket.isAuthenticated) {
      socket.close(3000, "Unauthorized");
      return;
    }

    const msgPayload = JSON.parse(rawMessage);
    
    if (msgPayload.type === "NOTIFICATION_READ") {
      console.log("WebSocket: payload received: ", msgPayload);
      
      if (msgPayload.notification_ids && Array.isArray(msgPayload.notification_ids)) {
        for (const notifId of msgPayload.notification_ids) {
          const existingNotif = await locateNotification(dbConn, notifId);
          if (!existingNotif) continue;

          const markResult = await setAsRead(dbConn, notifId);
          if (!markResult) continue;
          console.log(`Notification with id ${notifId} is marked read...`);
        }

        // Send updated unread count
        const { count: newCount, ids: newIds } = await fetchUnreadCount(dbConn, socket.userId);
        socket.send(
          JSON.stringify({
            type: "UNREAD_COUNT",
            count: newCount,
            notification_ids: newIds,
          })
        );
      }
    }
  });

  socket.on("error", (err) => {
    console.error("WebSocket: Client error:", err);
  });

  socket.on("close", () => {
    console.log("WebSocket: Client disconnected.");
    if (socket.isAuthenticated && connectedUsers.has(socket.userId)) {
      connectedUsers.get(socket.userId).delete(socket);
      if (connectedUsers.get(socket.userId).size === 0) {
        connectedUsers.delete(socket.userId);
      }
    }
  });
});

// Consume notification messages from event bus
notificationBus.consumeMessages(async (incomingNotif) => {
  if (incomingNotif.type === "DELETE") {
    const targetUserId = incomingNotif.userId;
    const userExists = await redisClient.sIsMember("userIds", `${targetUserId}`);
    console.log("idExist value: ", userExists);
    
    if (!userExists) return;
    
    await removeNotifications(dbConn, targetUserId);
    connectedUsers.get(targetUserId)?.forEach((socket) => {
      socket.close(1010, "Mandatory exit");
    });
    
  } else if (incomingNotif.type === "FRIEND_REQUEST_CANCELED") {
    const senderId = incomingNotif.sender_id;
    const recipientId = incomingNotif.recipient_id;
    
    const senderExists = await redisClient.sIsMember("userIds", `${senderId}`);
    const recipientExists = await redisClient.sIsMember("userIds", `${recipientId}`);
    console.log("sIdExist value: ", senderExists, "rIdExist value: ", recipientExists);
    
    if (!senderExists || !recipientExists) return;
    
    const removedNotifId = await removeFriendRequestNotification(
      dbConn,
      senderId,
      incomingNotif.recipient_id
    );
    incomingNotif.notification_id = removedNotifId;

    // Send cancellation to recipient
    const recipientSockets = connectedUsers.get(recipientId);
    if (recipientSockets) {
      const messageStr = JSON.stringify(incomingNotif);
      for (const conn of recipientSockets) {
        if (conn.isAuthenticated && conn.readyState === WebSocket.OPEN) {
          conn.send(messageStr);
        }
      }
    }
  } else {
    console.log("RabbitMQ: notification received: ", incomingNotif);
    const recipientId = incomingNotif.recipient_id;
    
    const recipientExists = await redisClient.sIsMember("userIds", `${recipientId}`);
    console.log("idExist value: ", recipientExists);
    
    if (!recipientExists) return;
    
    console.log("RabbitMQ: recipient: ", recipientId);
    
    if (recipientId) {
      const newNotifId = await insertNotification(dbConn, incomingNotif);
      incomingNotif.notification_id = newNotifId;
      console.log("Notification before sending: ", incomingNotif);
      
      const recipientSockets = connectedUsers.get(recipientId);
      if (recipientSockets) {
        const messageStr = JSON.stringify(incomingNotif);
        for (const conn of recipientSockets) {
          if (conn.isAuthenticated && conn.readyState === WebSocket.OPEN) {
            conn.send(messageStr);
          }
        }
        await setAsDelivered(dbConn, newNotifId);
      }
    }
  }
});

wsServer.on("error", (err) => {
  console.error("WebSocket: Server error:", err);
  process.exit(1);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  try {
    console.log(`Caught a signal or type ${signal}`);
    await notificationBus.close();
    await redisClient.close();
    await dbConn.close();
    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(0);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
