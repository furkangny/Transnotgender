/*
 * RabbitMQ Plugin
 * Message queue connection for relationships service
 */
import fp from 'fastify-plugin'
import RabbitMQClient from '../libs/RabbitMQClient.js'

async function rabbitMQPlugin(fastify, opts) {
    const mqClient = new RabbitMQClient(process.env.RABBITMQ_FRIENDS_QUEUE);
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