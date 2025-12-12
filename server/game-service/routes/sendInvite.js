import GameEventBus from "../tools/GameEventBus.js"

const sendInvite = async (req, reply, fastify) => {
    const { receiverId } = req.body;
    const senderId = req.user.id;
    const roomId = Math.random().toString(36).substr(2, 9);
    console.log("Invite details:", { senderId, receiverId, roomId });

    if (!roomId || !senderId || !receiverId)
        return reply.code(400).send({ error: "Missing fields" });

    const eventBus = new GameEventBus('game');
    await eventBus.connect();

    const redis = fastify.redis;
    if (!redis) {
        console.error("Redis client is not available");
        return reply.code(500).send({ error: "Redis client is not available" });
    }

    let isBlocked = await redis.sIsMember(`blocker:${senderId}`, `${receiverId}`)
    if (!isBlocked)
        isBlocked = await redis.sIsMember(`blocker:${receiverId}`, `${senderId}`)
    if (isBlocked)
        return reply.code(400).send({ error: "Block exists" });

    redis.set(`invite:${senderId}`, roomId, 'EX', 60 * 5);

    try {
        const message = {
            type: "INVITE_SENT",
            sender_id: senderId,
            recipient_id: receiverId,
            roomId,
        };
        await eventBus.produceMessage(message, 'notifications.game.invite');
        return reply.code(200).send({ message: "Invite notification queued" });
    } catch (error) {
        console.error("Failed to send to EventBus:", error);
        return reply.code(500).send({ error: "Failed to queue notification" });
    }
}
export default sendInvite;
