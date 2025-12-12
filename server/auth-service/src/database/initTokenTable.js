
export async function initTokenTable(db) {
    try {
        await db.exec(
            `CREATE TABLE IF NOT EXISTS token (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            revoked INTEGER DEFAULT 0,
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
            )`
        );
        console.log("Tokens table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
