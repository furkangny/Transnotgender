/*
 * RabbitMQ Plugin
 * Message queue connection for dashboard service
 */
import fp from 'fastify-plugin'
import EventBusClient from '../libs/EventBusClient.js'

async function rabbitMQPlugin(fastify, opts) {
    const mqClient = new EventBusClient(process.env.RABBITMQ_DASHBOARD_QUEUE);
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