export async function initRestrictionTable(db) {
    try {
        await db.exec(
            `CREATE TABLE IF NOT EXISTS block (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blocker_id INTEGER NOT NULL,
            blocked_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(blocker_id, blocked_id)
            )`
        );
        console.log("Restrictions table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
