/*
 * Rematch Route
 * Sends play again notification
 */
import GameEventBus from "../tools/GameEventBus.js";

const rematch = async (req, res) => {
    const { sender_id, recipient_id } = req.body;
    console.log("Play again request received:", {
        sender_id,
        recipient_id,
    });
    if (!sender_id || !recipient_id) {
        return res.code(400).send({ error: "Missing required fields" });
    }
    try {
        const mqClient = new GameEventBus("game");
        await mqClient.connect();
        const msgPayload = {
            type: "PLAY_AGAIN",
            sender_id,
            recipient_id,
        };
        await mqClient.produceMessage(msgPayload, "notifications.game.playAgain");
        return res.code(200).send({ message: "Play again notification queued" });
    } catch (err) {
        console.error("Failed to send to EventBus:", err);
        return res.code(500).send({ error: "Failed to queue notification" });
    }
};

export default rematch;
