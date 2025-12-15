/*
 * Pending Credentials Repository
 * Stores temporary credential changes awaiting verification
 */

// SQL Queries
const QUERIES = {
    FIND_BY_USER: 'SELECT new_email, new_password FROM pending_credentials WHERE user_id = ?',
    UPSERT: `INSERT INTO pending_credentials (user_id, new_email, new_password) 
        VALUES (?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET 
            new_email = excluded.new_email,
            new_password = excluded.new_password;`,
    DELETE: 'DELETE FROM pending_credentials WHERE user_id = ?'
};

export async function fetchPendingChangeByAccountId(dbConn, accountId) {
    return await dbConn.get(QUERIES.FIND_BY_USER, [accountId]);
}

export async function insertPendingChange(dbConn, accountId, newEmail, newPassword) {
    await dbConn.run(QUERIES.UPSERT, [accountId, newEmail, newPassword]);
}

export async function removePendingChange(dbConn, accountId) {
    await dbConn.run(QUERIES.DELETE, [accountId]);
}
