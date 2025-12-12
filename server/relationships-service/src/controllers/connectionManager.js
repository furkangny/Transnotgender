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

export async function initiateConnection(request, reply) {
    try {
        const requesterId = request.user.id;
        const { addresseeId } = request.body;

        if (!addresseeId)
            return reply.code(400).send(createResponse(400, 'ADDRESSEE_REQUIRED'));

        if (requesterId === addresseeId)
            return reply.code(400).send(createResponse(400, 'ADDRESSEE_INVALID'));

        let blockExist = await this.redis.sIsMember(`blocker:${requesterId}`, `${addresseeId}`);
        if (!blockExist)
            blockExist = await this.redis.sIsMember(`blocker:${addresseeId}`, `${requesterId}`);
        if (blockExist)
            return reply.code(400).send(createResponse(400, 'BLOCK_EXISTS'));

        let exists = await insertConnectionRequest(this.db, requesterId, addresseeId);
        if (exists)
            return reply.code(400).send(createResponse(400, 'FRIEND_REQUEST_ALREADY_SENT'));

        this.rabbit.produceMessage(
            {
                type: 'FRIEND_REQUEST_SENT',
                sender_id: requesterId,
                recipient_id: addresseeId
            },
            'notifications.friend_request.sent'
        );

        return reply.code(200).send(createResponse(200, 'FRIEND_REQUEST_SENT'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function approveConnection(request, reply) {
    try {
        const addresseeId = request.user.id;
        const { requesterId } = request.body;

        if (!requesterId)
            return reply.code(400).send(createResponse(400, 'REQUESTER_REQUIRED'));

        const idExist = await this.redis.sIsMember('userIds', `${requesterId}`);
        console.log('idExist value: ', idExist);
        if (!idExist || addresseeId === requesterId)
            return reply.code(400).send(createResponse(400, 'REQUESTER_INVALID'));

        let isValid = await modifyConnectionStatus(this.db, requesterId, addresseeId, 'accepted');
        if (!isValid)
            return reply.code(400).send(createResponse(400, 'FRIEND_REQUEST_INVALID'));

        this.rabbit.produceMessage(
            {
                type: 'FRIEND_REQUEST_ACCEPTED',
                sender_id: addresseeId,
                recipient_id: requesterId
            },
            'notifications.friend_request.accepted'
        );

        return reply.code(200).send(createResponse(200, 'FRIEND_REQUEST_ACCEPTED'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function declineConnection(request, reply) {
    try {
        const addresseeId = request.user.id;
        const { requesterId } = request.body;

        if (!requesterId)
            return reply.code(400).send(createResponse(400, 'REQUESTER_REQUIRED'));

        const idExist = await this.redis.sIsMember('userIds', `${requesterId}`);
        console.log('idExist value: ', idExist);
        if (!idExist || addresseeId === requesterId)
            return reply.code(400).send(createResponse(400, 'REQUESTER_INVALID'));

        let isValid = await removeConnectionRecord(this.db, addresseeId, requesterId);
        if (!isValid)
            return reply.code(400).send(createResponse(400, 'FRIEND_REQUEST_INVALID'));

        this.rabbit.produceMessage(
            {
                type: 'FRIEND_REQUEST_CANCELED',
                sender_id: addresseeId,
                recipient_id: requesterId
            },
            'notifications.friend_request.canceled'
        );
        return reply.code(200).send(createResponse(200, 'FRIEND_REQUEST_REJECTED'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function terminateConnection(request, reply) {
    try {
        const userId = request.user.id;
        const friendId = parseInt(request.params.friendId);

        if (!friendId)
            return reply.code(400).send(createResponse(400, 'FRIEND_REQUIRED'));

        const idExist = await this.redis.sIsMember('userIds', `${friendId}`);
        console.log('idExist value: ', idExist);
        if (!idExist || userId === friendId)
            return reply.code(400).send(createResponse(400, 'FRIEND_INVALID'));

        let isDeleted = await removeConnection(this.db, userId, friendId);
        if (!isDeleted)
            return reply.code(400).send(createResponse(200, 'FRIEND_REQUEST_INVALID'));

        return reply.code(200).send(createResponse(200, 'FRIEND_REMOVED'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function fetchConnections(request, reply) {
    try {
        const userId = request.user.id;

        const friends = await fetchConnectionsByAccountId(this.db, userId);

        return reply.code(200).send(createResponse(200, 'FRIENDS_LISTED', { friends: friends }));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function fetchPendingConnections(request, reply) {
    try {
        const userId = request.user.id;

        const pendingRequests = await fetchPendingByAccountId(this.db, userId);
        const sentRequests = await fetchSentByAccountId(this.db, userId);

        return reply.code(200).send(createResponse(200, 'REQUESTS_LISTED', { pendingRequests: pendingRequests, sentRequests: sentRequests }));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}
