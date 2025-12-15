/*
 * Game Service - Main Entry Point
 * Handles real-time game sessions via WebSocket
 */
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import redisPlugin from "./tools/redis.js";
import { validateToken, verifyWSToken } from "./tools/tokenGuard.js";
import sqlitePlugin, { createGamesTable } from "./tools/sqlite-plugin.js";
import { pollForNewMatches } from "./routes/matchActivity.js";

// Initialize Fastify app
const app = Fastify();

// Register plugins
await app.register(redisPlugin);
await app.register(sqlitePlugin);
await createGamesTable(app.db);

// Poll for new matches every 2 seconds
const POLL_INTERVAL_MS = 2000;
setInterval(() => {
  pollForNewMatches(app.db);
}, POLL_INTERVAL_MS);

app.register(websocket);

// Local games WebSocket route
import { localMatch } from "./routes/localMatch.js";
app.register(async function (fastify) {
  fastify.get("/game/ws", { websocket: true }, (connection, req) => {
    localMatch(connection);
  });
});

// Remote games WebSocket route
import { remoteMatch } from "./routes/remoteMatch.js";
app.register(async function (fastify) {
  fastify.get("/game/remoteGame", { websocket: true }, async (socket, req) => {
    try {
      console.log("WebSocket connection attempt - verifying token...");

      socket.userId = null;
      socket.isAuthenticated = false;
      
      // Verify token before proceeding
      await verifyWSToken(socket, req, fastify.redis);

      // Check if socket is still open after verification
      if (socket.readyState !== socket.OPEN) {
        console.log("Socket closed during verification");
        return;
      }
      
      console.log("entering remote games");
      remoteMatch(socket, req);

    } catch (err) {
      console.error("Error in WebSocket route:", err);
      if (socket.readyState === socket.OPEN) {
        socket.close(3000, 'Authentication failed');
      }
    }
  });
});

// Store game stats route
import saveMatchStats from "./routes/saveMatchStats.js";
app.register(async function (fastify) {
  fastify.post("/game/storePlayerData", { preHandler: [validateToken] }, async (req, reply) => {
    await saveMatchStats(req, reply, fastify.db);
  });
});

// Send game invite route
import sendInvite from './routes/sendInvite.js';
app.register(async function (fastify) {
  fastify.post("/game/invite", { preHandler: [validateToken] }, async (req, reply) => {
    return sendInvite(req, reply, fastify);
  });
});

// Accept game invite route
import acceptInvite from "./routes/acceptInvite.js";
app.register(async function (fastify) {
  fastify.post("/game/accept", { preHandler: [validateToken] }, async (req, reply) => {
    return acceptInvite(req, reply, fastify);
  });
});

// Fetch room ID route
import fetchRoomId from "./routes/fetchRoomId.js";
app.register(async function (fastify) {
  fastify.post("/game/getRoomId", { preHandler: [validateToken] }, async (req, reply) => {
    return fetchRoomId(req, reply, fastify);
  });
});

// Fetch user history route
import fetchUserHistory from "./routes/fetchUserHistory.js";
app.register(async function (fastify) {
  fastify.post("/game/user-history", { preHandler: [validateToken] }, async (req, reply) => {
    return fetchUserHistory(req, reply, fastify.db);
  });
});

// Match activity WebSocket route
import matchActivity from "./routes/matchActivity.js";
app.register(async function (fastify) {
  fastify.get("/game/recent-activity", { websocket: true }, (connection, req) => {
    matchActivity(connection, req, fastify.db);
  });
});

// Rematch route
import rematch from "./routes/rematch.js";
app.register(async function (fastify) {
  fastify.post("/game/restart-match", { preHandler: [validateToken] }, async (req, reply) => {
    return rematch(req, reply);
  });
});

// Start server
const SERVER_PORT = 5000;
app.listen({ port: SERVER_PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Game service listening on port ${SERVER_PORT}`);
});
