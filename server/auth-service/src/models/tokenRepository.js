/*
 * Token Repository - Database Operations
 * JWT refresh token management
 */

// SQL Queries
const QUERIES = {
    FIND_BY_ID: 'SELECT * FROM token WHERE id = ?',
    FIND_BY_TOKEN: 'SELECT * FROM token WHERE token = ?',
    INSERT: "INSERT INTO token (token, expires_at, user_id) VALUES (?, DATETIME('now', '+7 days'), ?)",
    REVOKE: 'UPDATE token SET revoked = 1 where token = ?',
    FIND_VALID_BY_USER: "SELECT * FROM token WHERE user_id = ? AND revoked = 0 AND expires_at > DATETIME('now')"
};

export async function locateTokenById(dbConn, tokenId) {
    return await dbConn.get(QUERIES.FIND_BY_ID, [tokenId]);
}

export async function locateToken(dbConn, tokenValue) {
    return await dbConn.get(QUERIES.FIND_BY_TOKEN, [tokenValue]);
}

export async function insertToken(dbConn, tokenValue, accountId) {
    const result = await dbConn.run(QUERIES.INSERT, [tokenValue, accountId]);
    console.log("Token inserted with ID:", result.lastID);
    return result.lastID;
}

export async function invalidateToken(dbConn, tokenValue) {
    const result = await dbConn.run(QUERIES.REVOKE, [tokenValue]);
    console.log("Token invalidated with ID:", result.lastID);
    return result.lastID;
}

export async function locateValidTokenByAccountId(dbConn, accountId) {
    return await dbConn.get(QUERIES.FIND_VALID_BY_USER, [accountId]);
}
