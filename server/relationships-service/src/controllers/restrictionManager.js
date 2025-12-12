import { insertRestriction, fetchRestrictionList, removeRestriction } from "../models/restrictionRepository.js";
import { removeConnection } from "../models/connectionRepository.js";
import { createResponse } from "../utils/helpers.js";

export async function applyRestriction(request, reply) {
    try {
        const userId = request.user.id;
        const blockedId = parseInt(request.params.blockedId);

        if (!blockedId)
            return reply.code(400).send(createResponse(400, 'BLOCKED_REQUIRED'));

        const idExist = await this.redis.sIsMember('userIds', `${blockedId}`);
        console.log('idExist value: ', idExist);
        if (!idExist || userId === blockedId)
            return reply.code(400).send(createResponse(400, 'BLOCKED_INVALID'));

        let blockExist = await this.redis.sIsMember(`blocker:${userId}`, `${blockedId}`);
        if (!blockExist)
            blockExist = await this.redis.sIsMember(`blocker:${blockedId}`, `${userId}`);
        if (blockExist)
            return reply.code(400).send(createResponse(400, 'BLOCK_EXISTS'));

        await insertRestriction(this.db, userId, blockedId);
        await removeConnection(this.db, userId, blockedId);

        await this.redis.sAdd(`blocker:${userId}`, `${blockedId}`);
        await this.redis.sAdd(`blocker:${blockedId}`, `${userId}`);

        return reply.code(200).send(createResponse(200, 'BLOCK_SUCCESS'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}


export async function liftRestriction(request, reply) {
    try {
        const userId = request.user.id;
        const blockedId = parseInt(request.params.blockedId);

        if (!blockedId)
            return reply.code(400).send(createResponse(400, 'BLOCKED_REQUIRED'));

        const idExist = await this.redis.sIsMember('userIds', `${blockedId}`);
        console.log('idExist value: ', idExist);
        if (!idExist || userId === blockedId)
            return reply.code(400).send(createResponse(400, 'BLOCKED_INVALID'));

        let blockExist = await this.redis.sIsMember(`blocker:${userId}`, `${blockedId}`);
        if (!blockExist)
            return reply.code(400).send(createResponse(400, 'BLOCK_NOT_FOUND'));

        await removeRestriction(this.db, userId, blockedId);

        await this.redis.sRem(`blocker:${userId}`, `${blockedId}`);
        await this.redis.sRem(`blocker:${blockedId}`, `${userId}`);

        return reply.code(200).send(createResponse(200, 'UNBLOCK_SUCCESS'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function fetchRestrictions(request, reply) {
    try {
        const userId = request.user.id;

        const blockList = await fetchRestrictionList(this.db, userId);

        return reply.code(200).send(createResponse(200, 'BlOCK_LIST_FETCHED', { blockList: blockList }));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}


export async function checkRestrictionStatus(request, reply) {
    try {
        const userId = request.user.id;

        const blockedId = parseInt(request.params.blockedId);
        if (!blockedId)
            return reply.code(400).send(createResponse(400, 'BLOCKED_REQUIRED'));

        const idExist = await this.redis.sIsMember('userIds', `${blockedId}`);
        console.log('idExist value: ', idExist);
        if (!idExist || userId === blockedId)
            return reply.code(400).send(createResponse(400, 'BLOCKED_INVALID'));

        let isBlocked = await this.redis.sIsMember(`blocker:${userId}`, `${blockedId}`);
        if (!isBlocked)
            isBlocked = await this.redis.sIsMember(`blocker:${blockedId}`, `${userId}`);

        return reply.code(200).send(createResponse(200, 'IS_BLOCKED', { isBlocked: isBlocked }));

    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}
