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

const server = fastify({ logger: true });
await server.register(multipart, {
    limits: {
        fileSize: 25000000,
        files: 1
    }
});

dotenv.config();

await server.register(sqlitePlugin);
await server.register(rabbitmqPlugin);
await server.register(websocket);

await initMemberTable(server.db);

await server.register(memberEndpoints, { prefix: '/profile' });

await server.register(redisPlugin);

console.log("profile service initialization is done...");

const start = async () => {
    try {
        await server.listen({ host: `${process.env.HOST_NAME}`, port: 3001 });
        server.log.info("Server is listening on port 3001");
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

server.rabbit.consumeMessages(async (request) => {
    console.log("Body received from profile:", request);
    const idExist = await server.redis.sIsMember('userIds', `${request.userId}`);
    console.log('idExist value: ', idExist);
    if (!idExist)
        return;
    if (request.type === 'UPDATE') {
        const { userId, email } = request;
        await modifyMemberEmailById(server.db, userId, email);
    } else if (request.type === 'INSERT') {
        let avatarUrl = null;
        const { userId, username, email, avatar_url, gender } = request;
        if (avatar_url)
            avatarUrl = await downloadAvatarUrl(avatar_url, userId);
        await insertMember(server.db, userId, username, email, avatarUrl, gender);
        const profile = await locateMemberById(server.db, userId);
        await server.redis.sendCommand([
            'JSON.SET',
            `player:${userId}`,
            '$',
            JSON.stringify(profile)
        ])
    } else if (request.type === 'DELETE') {
        const userId = request.userId;
        await removeMember(server.db, userId);
        await server.redis.sendCommand([
            'JSON.DEL',
            `player:${userId}`,
            '$'
        ])
    } else if (request.type === 'UPDATE_RANK') {
        const { userId, rank } = request;
        await modifyRankById(server.db, userId, rank);
        const updatedProfile = await locateMemberById(server.db, userId);
        await server.redis.sendCommand([
            'JSON.SET',
            `player:${userId}`,
            '$',
            JSON.stringify(updatedProfile)
        ])
        console.log("Updated rank successfully");
    }
})

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
