/*
 * Redis Plugin
 * Cache connection for relationships service
 */
import fp from 'fastify-plugin';
import { createClient } from 'redis';

const REDIS_URL = 'redis://redis:6379';

async function redisPlugin(fastify, opts) {
    const redisClient = await createClient({
        url: REDIS_URL
    })
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();
    console.log('Redis is connected...', redisClient);

    fastify.decorate('redis', redisClient);
};

export default fp(redisPlugin);
