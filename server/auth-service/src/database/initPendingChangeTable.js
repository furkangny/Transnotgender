
export async function initPendingChangeTable(db) {
    try {
        await db.exec(
            `CREATE TABLE IF NOT EXISTS pending_credentials (
            user_id INTEGER PRIMARY KEY,
            new_email TEXT DEFAULT NULL,
            new_password TEXT DEFAULT NULL
            )`
        );
        console.log("Pending changes table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
