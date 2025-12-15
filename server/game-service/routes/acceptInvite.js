/*
 * Accept Invite Route
 * Accepts game invitation from another player
 */
import GameEventBus from "../tools/GameEventBus.js";

const acceptInvite = async (req, res, fastify) => {
    try {
        const { roomId, senderId, receiverId } = req.body;

        if (!roomId || !senderId || !receiverId)
            return res.code(400).send({ error: "Missing fields" });

        console.log("Accepting invite:", {
            roomId,
            senderId,
            receiverId,
        });
        const redisClient = fastify.redis;
        if (!redisClient) {
            console.error("Redis client is not available");
            return res.code(500).send({ error: "Redis client is not available" });
        }

        let isBlocked = await redisClient.sIsMember(
            `blocker:${senderId}`,
            `${receiverId}`
        );
        if (!isBlocked)
            isBlocked = await redisClient.sIsMember(`blocker:${receiverId}`, `${senderId}`);
        if (isBlocked) return res.code(400).send({ error: "Block exists" });

        redisClient.set(`invite:${receiverId}`, roomId, "EX", 60 * 5);

        const mqClient = new GameEventBus("game");
        await mqClient.connect();

        const msgPayload = {
            type: "INVITE_ACCEPTED",
            sender_id: receiverId,
            recipient_id: senderId,
            roomId,
        };

        await mqClient.produceMessage(msgPayload, "notifications.game.accept");
        return res
            .code(200)
            .send({ message: "Invite accepted", roomId, receiverId });
    } catch (err) {
        console.error("Error accepting invite:", err);
        return res.code(500).send({ error: "Internal server error" });
    }
};
export default acceptInvite;
