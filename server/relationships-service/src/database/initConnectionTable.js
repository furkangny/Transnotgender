/*
 * Connection Table Initialization
 * Creates friendships table
 */

const FRIENDSHIPS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL,
    addressee_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, addressee_id)
)`;

export async function initConnectionTable(dbConn) {
    try {
        await dbConn.exec(FRIENDSHIPS_TABLE_SQL);
        console.log("Connections table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
