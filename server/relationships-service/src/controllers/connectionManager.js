/*
 * Connection Manager Controller
 * Handles friend requests and connections
 */

import {
    insertConnectionRequest,
    modifyConnectionStatus,
    removeConnection,
    fetchConnectionsByAccountId,
    fetchPendingByAccountId,
    removeConnectionRecord,
    fetchSentByAccountId
} from '../models/connectionRepository.js';
import { createResponse } from '../utils/helpers.js';

/*
 * Send Friend Request
 */
export async function initiateConnection(req, res) {
    try {
        const requesterId = req.user.id;
        const { addresseeId } = req.body;

        if (!addresseeId)
            return res.code(400).send(createResponse(400, 'ADDRESSEE_REQUIRED'));

        if (requesterId === addresseeId)
            return res.code(400).send(createResponse(400, 'ADDRESSEE_INVALID'));

        let blockExists = await this.redis.sIsMember(`blocker:${requesterId}`, `${addresseeId}`);
        if (!blockExists)
            blockExists = await this.redis.sIsMember(`blocker:${addresseeId}`, `${requesterId}`);
        if (blockExists)
            return res.code(400).send(createResponse(400, 'BLOCK_EXISTS'));

        let alreadyExists = await insertConnectionRequest(this.db, requesterId, addresseeId);
        if (alreadyExists)
            return res.code(400).send(createResponse(400, 'FRIEND_REQUEST_ALREADY_SENT'));

        this.rabbit.produceMessage(
            {
                type: 'FRIEND_REQUEST_SENT',
                sender_id: requesterId,
                recipient_id: addresseeId
            },
            'notifications.friend_request.sent'
        );

        return res.code(200).send(createResponse(200, 'FRIEND_REQUEST_SENT'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Accept Friend Request
 */
export async function approveConnection(req, res) {
    try {
        const addresseeId = req.user.id;
        const { requesterId } = req.body;

        if (!requesterId)
            return res.code(400).send(createResponse(400, 'REQUESTER_REQUIRED'));

        const userExists = await this.redis.sIsMember('userIds', `${requesterId}`);
        console.log('userExists value: ', userExists);
        if (!userExists || addresseeId === requesterId)
            return res.code(400).send(createResponse(400, 'REQUESTER_INVALID'));

        let isValid = await modifyConnectionStatus(this.db, requesterId, addresseeId, 'accepted');
        if (!isValid)
            return res.code(400).send(createResponse(400, 'FRIEND_REQUEST_INVALID'));

        this.rabbit.produceMessage(
            {
                type: 'FRIEND_REQUEST_ACCEPTED',
                sender_id: addresseeId,
                recipient_id: requesterId
            },
            'notifications.friend_request.accepted'
        );

        return res.code(200).send(createResponse(200, 'FRIEND_REQUEST_ACCEPTED'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Decline Friend Request
 */
export async function declineConnection(req, res) {
    try {
        const addresseeId = req.user.id;
        const { requesterId } = req.body;

        if (!requesterId)
            return res.code(400).send(createResponse(400, 'REQUESTER_REQUIRED'));

        const userExists = await this.redis.sIsMember('userIds', `${requesterId}`);
        console.log('userExists value: ', userExists);
        if (!userExists || addresseeId === requesterId)
            return res.code(400).send(createResponse(400, 'REQUESTER_INVALID'));

        let isValid = await removeConnectionRecord(this.db, addresseeId, requesterId);
        if (!isValid)
            return res.code(400).send(createResponse(400, 'FRIEND_REQUEST_INVALID'));

        this.rabbit.produceMessage(
            {
                type: 'FRIEND_REQUEST_CANCELED',
                sender_id: addresseeId,
                recipient_id: requesterId
            },
            'notifications.friend_request.canceled'
        );
        return res.code(200).send(createResponse(200, 'FRIEND_REQUEST_REJECTED'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Remove Friend
 */
export async function terminateConnection(req, res) {
    try {
        const accountId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        if (!friendId)
            return res.code(400).send(createResponse(400, 'FRIEND_REQUIRED'));

        const userExists = await this.redis.sIsMember('userIds', `${friendId}`);
        console.log('userExists value: ', userExists);
        if (!userExists || accountId === friendId)
            return res.code(400).send(createResponse(400, 'FRIEND_INVALID'));

        let isDeleted = await removeConnection(this.db, accountId, friendId);
        if (!isDeleted)
            return res.code(400).send(createResponse(200, 'FRIEND_REQUEST_INVALID'));

        return res.code(200).send(createResponse(200, 'FRIEND_REMOVED'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Get Friends List
 */
export async function fetchConnections(req, res) {
    try {
        const accountId = req.user.id;

        const friends = await fetchConnectionsByAccountId(this.db, accountId);

        return res.code(200).send(createResponse(200, 'FRIENDS_LISTED', { friends: friends }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Get Pending Friend Requests
 */
export async function fetchPendingConnections(req, res) {
    try {
        const accountId = req.user.id;

        const pendingRequests = await fetchPendingByAccountId(this.db, accountId);
        const sentRequests = await fetchSentByAccountId(this.db, accountId);

        return res.code(200).send(createResponse(200, 'REQUESTS_LISTED', { pendingRequests: pendingRequests, sentRequests: sentRequests }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}
