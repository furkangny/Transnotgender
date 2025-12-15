/*
 * Restriction Repository
 * Database operations for blocking
 */

const QUERIES = {
    FIND_RESTRICTION: `SELECT * FROM block WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
    INSERT_RESTRICTION: `INSERT INTO block (blocker_id, blocked_id) VALUES (?, ?)`,
    DELETE_RESTRICTION: `DELETE FROM block WHERE blocker_id = ? AND blocked_id = ?`,
    FETCH_ALL: `SELECT * FROM block WHERE blocker_id = ?`
};

export async function locateRestriction(dbConn, blockedId, blockerId) {
    console.log('Fetching restriction relationship...');
    const record = await dbConn.get(QUERIES.FIND_RESTRICTION,
        [
            blockerId,
            blockedId,
            blockedId,
            blockerId
        ]
    );
    return (record);
}

export async function insertRestriction(dbConn, blockerId, blockedId) {
    console.log('Inserting restriction relationship...');
    await dbConn.run(QUERIES.INSERT_RESTRICTION,
        [
            blockerId,
            blockedId
        ]
    );
}

export async function removeRestriction(dbConn, blockerId, blockedId) {
    console.log('Removing restriction relationship...');
    await dbConn.run(QUERIES.DELETE_RESTRICTION,
        [
            blockerId,
            blockedId
        ]
    );
}

export async function fetchRestrictionList(dbConn, accountId) {
    console.log('Fetching restriction list...');
    return await dbConn.all(QUERIES.FETCH_ALL, [accountId]);
}
