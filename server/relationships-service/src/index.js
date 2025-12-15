/*
 * Relationships Service - Main Entry Point
 * Manages friend connections and user blocking
 */
import fastify from 'fastify';
import dotenv from 'dotenv';
import sqlitePlugin from './plugins/sqlite-plugin.js'
import connectionEndpoints from './routes/connectionEndpoints.js';
import { initConnectionTable } from './database/initConnectionTable.js';
import rabbitmqPlugin from './plugins/rabbitmq-plugin.js';
import { removeAllConnections } from './models/connectionRepository.js';
import { initRestrictionTable } from './database/initRestrictionTable.js';
import restrictionEndpoints from './routes/restrictionEndpoints.js';
import redisPlugin from './plugins/redis-plugin.js';

// Load environment configuration
dotenv.config();

// Initialize Fastify app
const app = fastify({ logger: true });

// Register database plugin
await app.register(sqlitePlugin);

// Initialize database tables
await initConnectionTable(app.db);
await initRestrictionTable(app.db);

// Register message queue and cache
await app.register(rabbitmqPlugin);
await app.register(redisPlugin);

// Message queue consumer for user deletion
app.rabbit.consumeMessages(async (incomingMsg) => {
    if (incomingMsg.type === 'DELETE') {
        const targetUserId = incomingMsg.userId;
        const userExists = await app.redis.sIsMember('userIds', `${targetUserId}`);
        console.log('idExist value: ', userExists);
        
        if (userExists) {
            await removeAllConnections(app.db, targetUserId);
        }
    }
});

// Register route handlers
await app.register(connectionEndpoints, { prefix: '/friends' });
await app.register(restrictionEndpoints, { prefix: '/block' });

console.log("relationships service initialization is done...");

// Bootstrap server
const bootstrap = async () => {
    try {
        const hostAddress = process.env.HOST_NAME;
        const portNumber = 3002;
        await app.listen({ host: hostAddress, port: portNumber });
        app.log.info("Server is listening on port 3002");
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