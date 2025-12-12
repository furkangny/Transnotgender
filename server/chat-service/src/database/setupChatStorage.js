export async function initConversationTable(db) {
    try {
        await db.exec(
            `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient_id INTEGER,
            sender_id INTEGER,
            content TEXT NOT NULL,
            read INTEGER DEFAULT FALSE,
            delivered INTEGER DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        );
        console.log("Conversation table initialized.");
    } catch (error) {
        console.error("Error initializing table:", error.message);
    }
}
