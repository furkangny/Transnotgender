
import Fastify from "fastify";
import websocket from "@fastify/websocket";
// import cors from "@fastify/cors";
import redisPlugin from "./tools/redis.js";
import { validateToken, verifyWSToken } from "./tools/tokenGuard.js";
import sqlitePlugin, { createGamesTable } from "./tools/sqlite-plugin.js";
import { pollForNewMatches } from "./routes/matchActivity.js"; // Import the polling function
const fastify = Fastify();

await fastify.register(redisPlugin);
await fastify.register(sqlitePlugin);
await createGamesTable(fastify.db);
setInterval(() => {
  pollForNewMatches(fastify.db);
}, 2000);
fastify.register(websocket);


// local games
import { localMatch } from "./routes/localMatch.js";
fastify.register(async function (fastify) {
  fastify.get("/game/ws", { websocket: true }, (connection, req) => {
    localMatch(connection)
  });
});

// remote games route
import { remoteMatch } from "./routes/remoteMatch.js";
// ...existing code...
fastify.register(async function (fastify) {
  fastify.get("/game/remoteGame", { websocket: true }, async (socket, req) => {
    try {
      console.log("WebSocket connection attempt - verifying token...");

      socket.userId = null; // Initialize userId
      socket.isAuthenticated = false; // Initialize authentication status
      // Verify the token first
      await verifyWSToken(socket, req, fastify.redis);

      // Check if the socket is still open after verification
      if (socket.readyState !== socket.OPEN) {
        console.log("Socket closed during verification");
        return;
      }
      console.log("enterig remote games");
      remoteMatch(socket, req);

    } catch (error) {
      console.error("Error in WebSocket route:", error);
      if (socket.readyState === socket.OPEN) {
        socket.close(3000, 'Authentication failed');
      }
    }
  });
});
// ...existing code...
// route to store the game stats
import saveMatchStats from "./routes/saveMatchStats.js";
fastify.register(async function name(fastify) {
  fastify.post("/game/storePlayerData", { preHandler: [validateToken] }, async (req, reply) => {
    await saveMatchStats(req, reply, fastify.db);
  });
});

import sendInvite from './routes/sendInvite.js';
fastify.register(async function name(fastify) {
  fastify.post("/game/invite", { preHandler: [validateToken] }, async (req, reply) => {
    return sendInvite(req, reply, fastify);
  });
});

import acceptInvite from "./routes/acceptInvite.js";
fastify.register(async function name(fastify) {
  fastify.post("/game/accept", { preHandler: [validateToken] }, async (req, reply) => {
    return acceptInvite(req, reply, fastify);
  });
});

import fetchRoomId from "./routes/fetchRoomId.js";
fastify.register(async function name(req, reply) {
  fastify.post("/game/getRoomId", { preHandler: [validateToken] }, async (req, reply) => {
    return fetchRoomId(req, reply, fastify);
  });
});

import fetchUserHistory from "./routes/fetchUserHistory.js";
fastify.register(async function name(fastify) {
  fastify.post("/game/user-history", { preHandler: [validateToken] }, async (req, reply) => {
    return fetchUserHistory(req, reply, fastify.db);
  });
});

import matchActivity from "./routes/matchActivity.js";
fastify.register(async function (fastify) {
  fastify.get("/game/recent-activity", { websocket: true }, (connection, req) => {
    matchActivity(connection, req, fastify.db);
  });
});
import rematch from "./routes/rematch.js";
fastify.register(async function (fastify) {
  fastify.post("/game/restart-match", { preHandler: [validateToken] }, async (req, reply) => {
    return rematch(req, reply);
  });
});
fastify.listen({ port: 5000, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
