/*
 * Restriction Table Initialization
 * Creates block table
 */

const BLOCK_TABLE_SQL = `CREATE TABLE IF NOT EXISTS block (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
)`;

export async function initRestrictionTable(dbConn) {
    try {
        await dbConn.exec(BLOCK_TABLE_SQL);
        console.log("Restrictions table initialized.");
    } catch (err) {
        console.error("Error initializing table:", err.message);
    }
}
