export async function locateRestriction(db, blockedId, blockerId) {
    console.log('Fetching restriction relationship...');
    const result = await db.get('SELECT * FROM block WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
        [
            blockerId,
            blockedId,
            blockedId,
            blockerId
        ]
    )
    return (result);
}

export async function insertRestriction(db, blockerId, blockedId) {
    console.log('Inserting restriction relationship...');
    await db.run('INSERT INTO block (blocker_id, blocked_id) VALUES (?, ?)',
        [
            blockerId,
            blockedId
        ]
    )
}

export async function removeRestriction(db, blockerId, blockedId) {
    console.log('Removing restriction relationship...');
    await db.run('DELETE FROM block WHERE blocker_id = ? AND blocked_id = ?',
        [
            blockerId,
            blockedId
        ]
    );
}

export async function fetchRestrictionList(db, id) {
    console.log('Fetching restriction list...');
    return await db.all('SELECT * FROM block WHERE blocker_id = ?', [id]);
}
