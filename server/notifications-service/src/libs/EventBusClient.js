/*
 * Event Bus Client
 * RabbitMQ client for notifications service
 */
import amqp from 'amqplib'

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 1000;

class EventBusClient {
    constructor(queueName, connectionUrl = process.env.RABBITMQ_URL, exchangeName = 'microservices-exchange', exchangeType = 'topic') {
        this.connectionUrl = connectionUrl;
        this.queueName = queueName;
        this.msgChannel = null;
        this.exchangeName = exchangeName;
        this.exchangeType = exchangeType;
        this.activeConnection = null;
        this.reconnectCount = 0;
        this.isConnecting = false;
    }

    async connect() {
        if (this.isConnecting)
            return;

        this.isConnecting = true;
        try {
            this.activeConnection = await amqp.connect(this.connectionUrl);
            this.activeConnection.on('error', (err) => console.log('EventBusClient connection error: ', err));
            this.activeConnection.on('close', () => this.#attemptReconnect());

            this.msgChannel = await this.activeConnection.createChannel();
            this.msgChannel.on('error', async (err) => { console.log('EventBusClient channel error: ', err); });
            await this.msgChannel.assertExchange(this.exchangeName, this.exchangeType, { durable: true });
            await this.msgChannel.assertQueue(this.queueName, { durable: true });
            await this.msgChannel.bindQueue(this.queueName, this.exchangeName, 'notifications.#');

            this.isConnecting = false;
            this.reconnectCount = 0;
        } catch (err) {
            console.log('Failed to connect to EventBusClient: ', err);
            this.isConnecting = false;
            await this.#attemptReconnect();
            throw new Error(err);
        }
    }


    async #attemptReconnect() {
        this.msgChannel = null;
        this.activeConnection = null;
        if (this.reconnectCount >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Reached max reconnection attempts');
            return;
        }
        this.reconnectCount++;
        const delayMs = this.reconnectCount * RECONNECT_DELAY_MS;
        console.log(`Reconnecting in ${delayMs / 1000}s, attempt ${this.reconnectCount}...`);
        setTimeout(async () => {
            await this.connect();
        }, delayMs);
    }

    async produceMessage(msgPayload, routingKey) {
        try {

            if (!this.msgChannel)
                await this.connect();

            this.msgChannel.publish(
                this.exchangeName,
                routingKey,
                Buffer.from(JSON.stringify(msgPayload)),
                { persistent: true }
            );

        } catch (err) {
            console.log('Error producing messages.', err);
            throw new Error(err);
        }
    }

    async consumeMessages(messageHandler) {
        try {
            if (!this.msgChannel)
                await this.connect();

            await this.msgChannel.assertQueue(this.queueName, { durable: true });
            this.msgChannel.prefetch(1);
            this.msgChannel.consume(this.queueName, async (msg) => {
                if (msg !== null) {
                    const parsedPayload = JSON.parse(msg.content.toString());
                    try {
                        messageHandler(parsedPayload);
                        this.msgChannel.ack(msg);
                    } catch (err) {
                        console.log('Error handling message: ', err);
                        this.msgChannel.nack(msg, false, false);
                    }
                }
            });
        } catch (err) {
            console.log('Error consuming messages.');
            throw new Error(err);
        }
    }

    async close() {
        if (this.msgChannel) {
            await this.msgChannel.close();
            this.msgChannel = null;
        }
        if (this.activeConnection) {
            await this.activeConnection.close();
            this.activeConnection = null;
        }
    }
}

export default EventBusClient;
