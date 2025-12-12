export async function insertNotification(db, notification) {
    const result = await db.run(
        "INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, ?)",
        [notification.recipient_id, notification.sender_id, notification.type]
    );
    console.log(`Notification inserted with ID: ${result.lastID}`);
    return result.lastID;
}

export async function setAsRead(db, id) {
    const result = await db.run(
        "UPDATE notifications SET read = 1 WHERE id = ?",
        [id]
    );
    if (result.changes === 0) return false;
    return true;
}

export async function setAsDelivered(db, id) {
    await db.run("UPDATE notifications SET delivered = 1 WHERE id = ?", [id]);
}

// Get all unread notifications grouped by sender and type
export async function fetchAllNotifications(db, recipientId) {
    const result = await db.all(
        `
        SELECT 
            id, 
            sender_id, 
            type, 
            created_at,
            read,
            delivered
        FROM notifications
        WHERE recipient_id = ? AND read = 0
        ORDER BY created_at DESC`,
        [recipientId]
    );

    // Process notifications individually
    const notifications = result.map((notif) => ({
        notification_id: notif.id,
        sender_id: notif.sender_id,
        recipient_id: recipientId,
        type: notif.type,
        created_at: notif.created_at,
        read: notif.read,
        delivered: notif.delivered,
    }));

    return notifications;
}

export async function removeNotifications(db, id) {
    await db.run(
        "DELETE FROM notifications WHERE recipient_id = ? OR sender_id = ?",
        [id, id]
    );
}

export async function locateNotification(db, notificationId) {
    return await db.get("SELECT * FROM notifications WHERE id = ?", [
        notificationId,
    ]);
}

export async function removeFriendRequestNotification(
    db,
    senderId,
    recipientId
) {
    const notificationId = await db.get(
        `SELECT id FROM notifications WHERE recipient_id = ? AND sender_id = ? AND type = 'FRIEND_REQUEST_SENT'`,
        [recipientId, senderId]
    );
    if (notificationId)
        await db.run(
            `DELETE FROM notifications WHERE recipient_id = ? AND sender_id = ? AND type = 'FRIEND_REQUEST_SENT'`,
            [recipientId, senderId]
        );
    return notificationId;
}

// Get count of unread notifications
export async function fetchUnreadCount(db, recipientId) {
    const result = await db.all(
        `
        SELECT id 
        FROM notifications 
        WHERE recipient_id = ? AND read = 0`,
        [recipientId]
    );

    const count = result.length;
    const ids = result.map((notif) => notif.id);

    return { count, ids }; // Return both count and IDs
}
