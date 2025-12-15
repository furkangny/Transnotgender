/*
 * Notification Table Initialization
 * Creates notifications table
 */

const NOTIFICATIONS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER,
    sender_id INTEGER,
    type TEXT NOT NULL,
    read INTEGER DEFAULT FALSE,
    delivered INTEGER DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

export async function setupNotificationDB(dbConn) {
    try {
        await dbConn.exec(NOTIFICATIONS_TABLE_SQL);
        console.log("Notifications table created.");
    } catch (err) {
        console.error("Error creating table:", err.message);
    }
}
