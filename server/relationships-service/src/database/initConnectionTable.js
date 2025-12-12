export async function initConnectionTable(db) {
    try {
        await db.exec(
            `CREATE TABLE IF NOT EXISTS friendships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_id INTEGER NOT NULL,
            addressee_id INTEGER NOT NULL,
            status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(requester_id, addressee_id)
            )`
        );
        console.log("Connections table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
