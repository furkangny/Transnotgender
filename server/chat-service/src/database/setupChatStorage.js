/*
 * Chat Table Initialization
 * Creates messages table
 */

const MESSAGES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER,
    sender_id INTEGER,
    content TEXT NOT NULL,
    read INTEGER DEFAULT FALSE,
    delivered INTEGER DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

export async function initConversationTable(dbConn) {
    try {
        await dbConn.exec(MESSAGES_TABLE_SQL);
        console.log("Conversation table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
