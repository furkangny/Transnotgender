/*
 * Authentication Service - Main Entry Point
 * Handles user authentication, sessions, and 2FA
 */
import fastify from 'fastify';
import dotenv from 'dotenv';
import sqlitePlugin from './plugins/sqlite-plugin.js'
import jwtPlugin from './plugins/jwt-plugin.js'
import nodemailerPlugin from './plugins/nodemailer-plugin.js';
import { initAccountTable } from './database/initAccountTable.js';
import { initTokenTable } from './database/initTokenTable.js';
import { initMfaTable } from './database/initMfaTable.js';
import sessionEndpoints from './routes/sessionEndpoints.js';
import mfaEndpoints from './routes/mfaEndpoints.js';
import { initOAuthTable } from './database/initOAuthTable.js';
import rabbitmqPlugin from './plugins/rabbitmq-plugin.js';
import { modifyAccountUsername } from './models/accountRepository.js';
import { initPendingChangeTable } from './database/initPendingChangeTable.js';
import redisPlugin from './plugins/redis-plugin.js';
import rateLimit from '@fastify/rate-limit';

// Load environment configuration
dotenv.config();

// Initialize Fastify instance with logging
const app = fastify({ logger: true });

// Register core plugins
await app.register(sqlitePlugin);
await app.register(jwtPlugin, {
    accessTokenKey: process.env.AJWT_SECRET_KEY,
    refreshTokenKey: process.env.RJWT_SECRET_KEY,
    tempTokenKey: process.env.TJWT_SECRET_KEY
});

// Initialize database tables
await initAccountTable(app.db);
await initTokenTable(app.db);
await initMfaTable(app.db);
await initOAuthTable(app.db);
await initPendingChangeTable(app.db);

// Register additional plugins
await app.register(redisPlugin);
await app.register(nodemailerPlugin);
await app.register(rabbitmqPlugin);
await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
});

// Message queue consumer for username updates
app.rabbit.consumeMessages(async (incomingMessage) => {
    try {
        const { id: accountId, username: newUsername } = incomingMessage;
        if (newUsername) {
            await modifyAccountUsername(app.db, newUsername, accountId);
        }
        console.log('Auth: account updated.');
    } catch (err) {
        console.log('Error consuming message in auth-service', err);
    }
});

// Register route handlers
await app.register(sessionEndpoints, { prefix: '/auth' });
await app.register(mfaEndpoints, { prefix: '/2fa' });
console.log("auth service initialization is done...");

// Server bootstrap function
const bootstrap = async () => {
    try {
        const hostName = process.env.HOST_NAME;
        const portNumber = 3000;
        await app.listen({ host: hostName, port: portNumber });
        app.log.info("Server is listening on port 3000");
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
