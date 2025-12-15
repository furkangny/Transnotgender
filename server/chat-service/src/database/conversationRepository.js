/*
 * Conversation Repository
 * Database operations for chat messages
 */

const QUERIES = {
    INSERT_MSG: `INSERT INTO messages (recipient_id, sender_id, content) VALUES (?, ?, ?)`,
    MARK_READ: `UPDATE messages SET read = 1 AND delivered = 1 WHERE id = ?`,
    MARK_DELIVERED: `UPDATE messages SET delivered = 1 WHERE id = ?`,
    FETCH_ALL: `SELECT recipient_id, sender_id, content FROM messages WHERE recipient_id = ? OR sender_id = ? ORDER BY created_at`,
    FETCH_BY_ID: `SELECT * FROM messages WHERE id = ?`,
    DELETE_BY_USER: `DELETE FROM messages WHERE recipient_id = ? OR sender_id = ?`
};

export async function insertChatEntry(dbConn, message) {
    const outcome = await dbConn.run(QUERIES.INSERT_MSG,
        [
            message.recipient_id,
            message.sender_id,
            message.content
        ]
    );
    console.log(`Chat entry inserted with ID: ${outcome.lastID}`);
    return outcome.lastID;
}

export async function setEntryAsViewed(dbConn, entryId) {
    await dbConn.run(QUERIES.MARK_READ,
        [entryId]
    );
}

export async function setEntryAsReceived(dbConn, entryId) {
    await dbConn.run(QUERIES.MARK_DELIVERED,
        [entryId]
    );
}

export async function fetchAllEntries(dbConn, accountId) {
    const records = await dbConn.all(QUERIES.FETCH_ALL,
        [accountId, accountId]
    );
    console.log('Fetching all chat entries: ', records);
    return (records);
}

export async function fetchEntryById(dbConn, entryId) {
    const record = await dbConn.get(QUERIES.FETCH_BY_ID, [entryId]);
    console.log(`Fetching chat entry with ID ${entryId}`);
    return record;
}

export async function removeEntries(dbConn, accountId) {
    await dbConn.run(QUERIES.DELETE_BY_USER, [accountId, accountId]);
}
