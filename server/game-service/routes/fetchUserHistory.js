/*
 * Fetch User History Route
 * Retrieves game history for a user
 */

const HISTORY_QUERY = `SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC`;

async function fetchUserHistory(req, res, dbConn) {
    const accountId = req.body.userId;

    console.log("Fetching history for user ID:", accountId);

    if (!accountId) {
        return res.status(400).send({ error: "User ID is required" });
    }

    try {
        const gameRecords = await dbConn.all(HISTORY_QUERY, [accountId]);

        console.log(`Found ${gameRecords.length} games for user ${accountId}`);

        return res.send(gameRecords);
    } catch (err) {
        console.error("Error fetching user history:", err.message);
        return res.status(500).send({ error: "Database error" });
    }
}

export default fetchUserHistory;
