/*
 * RabbitMQ Plugin - Message Queue
 * Provides message broker connectivity
 */
import fp from 'fastify-plugin'
import RabbitMQClient from '../libs/RabbitMQClient.js'

async function rabbitMQPlugin(fastify, options) {
    const queueName = process.env.RABBITMQ_AUTH_QUEUE;
    const mqClient = new RabbitMQClient(queueName);
    
    try {
        await mqClient.connect();
        console.log("RabbitMQ connected...");
        fastify.decorate('rabbit', mqClient);
    } catch (err) {
        console.log("Failed to connect to RabbitMQ");
        throw new Error(err);
    }
}

export default fp(rabbitMQPlugin);