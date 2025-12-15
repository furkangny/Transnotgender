/*
 * Fetch Room ID Route
 * Retrieves game room ID from Redis
 */

const fetchRoomId = async (req, res, fastify) => {
    const { userId } = req.body;
    const redisClient = fastify.redis;

    if (!redisClient) {
        console.error("Redis client is not available");
        return res.code(500).send({ error: "Redis client is not available" });
    }

    if (!userId) {
        return res.code(400).send({ error: "Missing fields" });
    }

    try {
        const roomData = await redisClient.get(`invite:${userId}`);
        if (!roomData) {
            return res.code(404).send({ error: "Room not found" });
        }
        return res.code(200).send({ message: "Room found", roomData: roomData });
    } catch (err) {
        console.error("Error retrieving room data:", err);
        return res.code(500).send({ error: "Internal server error" });
    }
};
export default fetchRoomId;
