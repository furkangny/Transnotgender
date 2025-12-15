/*
 * Notification Repository
 * Database operations for notifications
 */

const QUERIES = {
    INSERT: `INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, ?)`,
    MARK_READ: `UPDATE notifications SET read = 1 WHERE id = ?`,
    MARK_DELIVERED: `UPDATE notifications SET delivered = 1 WHERE id = ?`,
    FETCH_ALL: `SELECT id, sender_id, type, created_at, read, delivered FROM notifications WHERE recipient_id = ? AND read = 0 ORDER BY created_at DESC`,
    DELETE_BY_USER: `DELETE FROM notifications WHERE recipient_id = ? OR sender_id = ?`,
    FIND_BY_ID: `SELECT * FROM notifications WHERE id = ?`,
    FIND_FRIEND_REQUEST: `SELECT id FROM notifications WHERE recipient_id = ? AND sender_id = ? AND type = 'FRIEND_REQUEST_SENT'`,
    DELETE_FRIEND_REQUEST: `DELETE FROM notifications WHERE recipient_id = ? AND sender_id = ? AND type = 'FRIEND_REQUEST_SENT'`,
    FETCH_UNREAD: `SELECT id FROM notifications WHERE recipient_id = ? AND read = 0`
};

export async function insertNotification(dbConn, notification) {
    const outcome = await dbConn.run(
        QUERIES.INSERT,
        [notification.recipient_id, notification.sender_id, notification.type]
    );
    console.log(`Notification inserted with ID: ${outcome.lastID}`);
    return outcome.lastID;
}

export async function setAsRead(dbConn, notifId) {
    const outcome = await dbConn.run(
        QUERIES.MARK_READ,
        [notifId]
    );
    if (outcome.changes === 0) return false;
    return true;
}

export async function setAsDelivered(dbConn, notifId) {
    await dbConn.run(QUERIES.MARK_DELIVERED, [notifId]);
}

/* Get all unread notifications grouped by sender and type */
export async function fetchAllNotifications(dbConn, recipientId) {
    const records = await dbConn.all(
        QUERIES.FETCH_ALL,
        [recipientId]
    );

    /* Process notifications individually */
    const notificationList = records.map((record) => ({
        notification_id: record.id,
        sender_id: record.sender_id,
        recipient_id: recipientId,
        type: record.type,
        created_at: record.created_at,
        read: record.read,
        delivered: record.delivered,
    }));

    return notificationList;
}

export async function removeNotifications(dbConn, accountId) {
    await dbConn.run(
        QUERIES.DELETE_BY_USER,
        [accountId, accountId]
    );
}

export async function locateNotification(dbConn, notificationId) {
    return await dbConn.get(QUERIES.FIND_BY_ID, [
        notificationId,
    ]);
}

export async function removeFriendRequestNotification(
    dbConn,
    senderId,
    recipientId
) {
    const notifRecord = await dbConn.get(
        QUERIES.FIND_FRIEND_REQUEST,
        [recipientId, senderId]
    );
    if (notifRecord)
        await dbConn.run(
            QUERIES.DELETE_FRIEND_REQUEST,
            [recipientId, senderId]
        );
    return notifRecord;
}

/* Get count of unread notifications */
export async function fetchUnreadCount(dbConn, recipientId) {
    const records = await dbConn.all(
        QUERIES.FETCH_UNREAD,
        [recipientId]
    );

    const totalCount = records.length;
    const idList = records.map((record) => record.id);

    return { count: totalCount, ids: idList };
}
