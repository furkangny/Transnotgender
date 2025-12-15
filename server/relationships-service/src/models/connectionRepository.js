/*
 * Connection Repository
 * Database operations for friendships
 */

const QUERIES = {
    CHECK_EXISTING: `SELECT * FROM friendships WHERE 
        (requester_id = ? AND addressee_id = ?) 
        OR (requester_id = ? AND addressee_id = ?)`,
    INSERT_REQUEST: `INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')`,
    UPDATE_STATUS: `UPDATE friendships SET status = ? WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
    DELETE_FRIENDSHIP: `DELETE FROM friendships WHERE 
        (requester_id = ? AND addressee_id = ? AND status = 'accepted') 
        OR (requester_id = ? AND addressee_id = ? AND status = 'accepted')`,
    FETCH_FRIENDS: `SELECT 
        CASE 
            WHEN requester_id = ? THEN addressee_id 
            ELSE requester_id 
        END AS friend_id
    FROM friendships
    WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'`,
    FETCH_PENDING: `SELECT requester_id FROM friendships WHERE addressee_id = ? AND status = 'pending'`,
    FETCH_SENT: `SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'pending'`,
    DELETE_ALL: `DELETE FROM friendships WHERE requester_id = ? OR addressee_id = ?`,
    DELETE_RECORD: `DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
};

export async function insertConnectionRequest(dbConn, requesterId, addresseeId) {
    const existingRecord = await dbConn.get(
        QUERIES.CHECK_EXISTING,
        [requesterId, addresseeId, addresseeId, requesterId]
    );

    if (existingRecord) {
        return true;
    }

    await dbConn.run(
        QUERIES.INSERT_REQUEST,
        [requesterId, addresseeId]
    );

    return false;
}

export async function modifyConnectionStatus(dbConn, requesterId, addresseeId, status) {
    if (!['accepted', 'rejected'].includes(status)) {
        return false;
    }

    const outcome = await dbConn.run(
        QUERIES.UPDATE_STATUS,
        [status, requesterId, addresseeId]
    );

    if (outcome.changes === 0) {
        return false;
    }

    return true;
}

export async function removeConnection(dbConn, accountId, friendId) {
    const outcome = await dbConn.run(
        QUERIES.DELETE_FRIENDSHIP,
        [accountId, friendId, friendId, accountId]
    );

    if (outcome.changes === 0) {
        return false
    }

    return true;
}

export async function fetchConnectionsByAccountId(dbConn, accountId) {
    const connectionList = await dbConn.all(
        QUERIES.FETCH_FRIENDS,
        [accountId, accountId, accountId]
    );

    return connectionList;
}

export async function fetchPendingByAccountId(dbConn, accountId) {
    const pendingList = await dbConn.all(
        QUERIES.FETCH_PENDING,
        [accountId]
    );

    return pendingList;
}

export async function fetchSentByAccountId(dbConn, accountId) {
    const sentList = await dbConn.all(
        QUERIES.FETCH_SENT,
        [accountId]
    );

    return sentList;
}


export async function removeAllConnections(dbConn, accountId) {
    const outcome = await dbConn.run(QUERIES.DELETE_ALL, [accountId, accountId]);
    if (outcome.changes === 0)
        return false;
    return true;
}

export async function removeConnectionRecord(dbConn, addresseeId, requesterId) {
    const outcome = await dbConn.run(
        QUERIES.DELETE_RECORD,
        [requesterId, addresseeId, addresseeId, requesterId]
    );

    if (outcome.changes === 0) {
        return false;
    }
    return true;
}
