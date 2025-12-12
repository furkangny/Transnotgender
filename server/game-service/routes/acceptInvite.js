import GameEventBus from "../tools/GameEventBus.js";
const acceptInvite = async (req, reply, fastify) => {
    try {
        const { roomId, senderId, receiverId } = req.body;

        if (!roomId || !senderId || !receiverId)
            return reply.code(400).send({ error: "Missing fields" });

        console.log("Accepting invite:", {
            roomId,
            senderId,
            receiverId,
        });
        const redis = fastify.redis;
        if (!redis) {
            console.error("Redis client is not available");
            return reply.code(500).send({ error: "Redis client is not available" });
        }

        let isBlocked = await redis.sIsMember(
            `blocker:${senderId}`,
            `${receiverId}`
        );
        if (!isBlocked)
            isBlocked = await redis.sIsMember(`blocker:${receiverId}`, `${senderId}`);
        if (isBlocked) return reply.code(400).send({ error: "Block exists" });

        redis.set(`invite:${receiverId}`, roomId, "EX", 60 * 5);

        const eventBus = new GameEventBus("game");
        await eventBus.connect();

        const message = {
            type: "INVITE_ACCEPTED",
            sender_id: receiverId,
            recipient_id: senderId,
            roomId,
        };

        await eventBus.produceMessage(message, "notifications.game.accept");
        return reply
            .code(200)
            .send({ message: "Invite accepted", roomId, receiverId });
    } catch (error) {
        console.error("Error accepting invite:", error);
        return reply.code(500).send({ error: "Internal server error" });
    }
};
export default acceptInvite;
