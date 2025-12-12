
export async function initAccountTable(db) {
    try {
        await db.exec(
            `CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        );
        console.log("Accounts table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
