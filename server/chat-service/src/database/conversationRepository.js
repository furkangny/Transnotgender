export async function insertChatEntry(db, message) {
    const result = await db.run('INSERT INTO messages (recipient_id, sender_id, content) VALUES (?, ?, ?)',
        [
            message.recipient_id,
            message.sender_id,
            message.content
        ]
    );
    console.log(`Chat entry inserted with ID: ${result.lastID}`);
    return result.lastID;
}

export async function setEntryAsViewed(db, id) {
    await db.run('UPDATE messages SET read = 1 AND delivered = 1 WHERE id = ?',
        [id]
    )
}

export async function setEntryAsReceived(db, id) {
    await db.run('UPDATE messages SET delivered = 1 WHERE id = ?',
        [id]
    )
}

export async function fetchAllEntries(db, id) {
    const result = await db.all('SELECT recipient_id, sender_id, content FROM messages WHERE recipient_id = ? OR sender_id = ? ORDER BY created_at',
        [id, id]
    );
    console.log('Fetching all chat entries: ', result);
    return (result);
}

export async function fetchEntryById(db, id) {
    const result = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
    console.log(`Fetching chat entry with ID ${id}`);
    return result;

}

export async function removeEntries(db, id) {
    await db.run('DELETE FROM messages WHERE recipient_id = ? OR sender_id = ?', [id, id]);
}
