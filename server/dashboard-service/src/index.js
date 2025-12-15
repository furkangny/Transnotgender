/*
 * Dashboard Service - Main Entry Point
 * Provides real-time dashboard data via WebSocket
 */
import fastify from "fastify";
import dotenv from 'dotenv';
import websocket from "@fastify/websocket";
import redisPlugin from "./plugins/redis-plugin.js";
import rabbitmqPlugin from "./plugins/rabbitmq-plugin.js";
import { dashboardEndpoints } from "./routes/dashboardEndpoints.js";

// Load environment configuration
dotenv.config();

// Initialize Fastify app
const app = fastify({ logger: true });

// Register plugins
await app.register(redisPlugin);
await app.register(rabbitmqPlugin);
await app.register(websocket);

// Register route handlers
await app.register(dashboardEndpoints, { prefix: '/dashboard' });

// Bootstrap server
const bootstrap = async () => {
    try {
        const hostAddress = process.env.HOST_NAME;
        const portNumber = 3005;
        await app.listen({ host: hostAddress, port: portNumber });
        app.log.info("Server is listening on port 3005");
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

bootstrap();

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    try {
        console.log(`Caught a signal or type ${signal}`);
        await app.rabbit.close();
        await app.redis.close();
        process.exit(0);
    } catch (err) {
        console.log(err);
        process.exit(0);
    }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
