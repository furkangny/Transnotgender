/*
 * Send Invite Route
 * Sends game invitation to another player
 */
import GameEventBus from "../tools/GameEventBus.js"

const sendInvite = async (req, res, fastify) => {
    const { receiverId } = req.body;
    const senderId = req.user.id;
    const roomId = Math.random().toString(36).substr(2, 9);
    console.log("Invite details:", { senderId, receiverId, roomId });

    if (!roomId || !senderId || !receiverId)
        return res.code(400).send({ error: "Missing fields" });

    const mqClient = new GameEventBus('game');
    await mqClient.connect();

    const redisClient = fastify.redis;
    if (!redisClient) {
        console.error("Redis client is not available");
        return res.code(500).send({ error: "Redis client is not available" });
    }

    let isBlocked = await redisClient.sIsMember(`blocker:${senderId}`, `${receiverId}`);
    if (!isBlocked)
        isBlocked = await redisClient.sIsMember(`blocker:${receiverId}`, `${senderId}`);
    if (isBlocked)
        return res.code(400).send({ error: "Block exists" });

    redisClient.set(`invite:${senderId}`, roomId, 'EX', 60 * 5);

    try {
        const msgPayload = {
            type: "INVITE_SENT",
            sender_id: senderId,
            recipient_id: receiverId,
            roomId,
        };
        await mqClient.produceMessage(msgPayload, 'notifications.game.invite');
        return res.code(200).send({ message: "Invite notification queued" });
    } catch (err) {
        console.error("Failed to send to EventBus:", err);
        return res.code(500).send({ error: "Failed to queue notification" });
    }
};
export default sendInvite;
