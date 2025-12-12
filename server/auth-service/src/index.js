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

const server = fastify({ logger: true });

dotenv.config();

await server.register(sqlitePlugin);
await server.register(jwtPlugin, {
    accessTokenKey: process.env.AJWT_SECRET_KEY,
    refreshTokenKey: process.env.RJWT_SECRET_KEY,
    tempTokenKey: process.env.TJWT_SECRET_KEY
});

await initAccountTable(server.db);
await initTokenTable(server.db);
await initMfaTable(server.db);
await initOAuthTable(server.db);
await initPendingChangeTable(server.db);

await server.register(redisPlugin);
await server.register(nodemailerPlugin);
await server.register(rabbitmqPlugin);
await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
});

server.rabbit.consumeMessages(async (message) => {
    try {
        const { id, username } = message;
        if (username)
            await modifyAccountUsername(server.db, username, id);
        console.log('Auth: account updated.');
    } catch (error) {
        console.log('Error consuming message in auth-service', error);
    }
});

await server.register(sessionEndpoints, { prefix: '/auth' });
await server.register(mfaEndpoints, { prefix: '/2fa' });
console.log("auth service initialization is done...");

const start = async () => {
    try {
        await server.listen({ host: `${process.env.HOST_NAME}`, port: 3000 });
        server.log.info("Server is listening on port 3000");
    }
    catch (err) {
        server.log.error(err);
        await server.redis.close();
        await server.db.close();
        await server.rabbit.close();
        await server.close();
        process.exit(1);
    }
};

start();

const handleShutDown = async (signal) => {
    try {
        console.log(`Caught a signal or type ${signal}`);
        await server.redis.close();
        await server.db.close();
        await server.rabbit.close();
        await server.close();
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(0);
    }
}

process.on('SIGINT', handleShutDown);
process.on('SIGTERM', handleShutDown);
