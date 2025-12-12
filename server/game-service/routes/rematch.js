import GameEventBus from "../tools/GameEventBus.js";

const rematch = async (req, reply) => {
    const { sender_id, recipient_id } = req.body;
    console.log("Play again request received:", {
        sender_id,
        recipient_id,
    });
    if (!sender_id || !recipient_id) {
        return reply.code(400).send({ error: "Missing required fields" });
    }
    try {
        const eventBus = new GameEventBus("game");
        await eventBus.connect();
        const message = {
            type: "PLAY_AGAIN",
            sender_id,
            recipient_id,
        };
        await eventBus.produceMessage(message, "notifications.game.playAgain");
        return reply.code(200).send({ message: "Play again notification queued" });
    } catch (error) {
        console.error("Failed to send to EventBus:", error);
        return reply.code(500).send({ error: "Failed to queue notification" });
    }
};

export default rematch;
