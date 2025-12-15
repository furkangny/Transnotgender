/*
 * Restriction Manager Controller
 * Handles user blocking/unblocking
 */

import { insertRestriction, fetchRestrictionList, removeRestriction } from "../models/restrictionRepository.js";
import { removeConnection } from "../models/connectionRepository.js";
import { createResponse } from "../utils/helpers.js";

/*
 * Block User
 */
export async function applyRestriction(req, res) {
    try {
        const accountId = req.user.id;
        const blockedId = parseInt(req.params.blockedId);

        if (!blockedId)
            return res.code(400).send(createResponse(400, 'BLOCKED_REQUIRED'));

        const userExists = await this.redis.sIsMember('userIds', `${blockedId}`);
        console.log('userExists value: ', userExists);
        if (!userExists || accountId === blockedId)
            return res.code(400).send(createResponse(400, 'BLOCKED_INVALID'));

        let blockExists = await this.redis.sIsMember(`blocker:${accountId}`, `${blockedId}`);
        if (!blockExists)
            blockExists = await this.redis.sIsMember(`blocker:${blockedId}`, `${accountId}`);
        if (blockExists)
            return res.code(400).send(createResponse(400, 'BLOCK_EXISTS'));

        await insertRestriction(this.db, accountId, blockedId);
        await removeConnection(this.db, accountId, blockedId);

        await this.redis.sAdd(`blocker:${accountId}`, `${blockedId}`);
        await this.redis.sAdd(`blocker:${blockedId}`, `${accountId}`);

        return res.code(200).send(createResponse(200, 'BLOCK_SUCCESS'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Unblock User
 */
export async function liftRestriction(req, res) {
    try {
        const accountId = req.user.id;
        const blockedId = parseInt(req.params.blockedId);

        if (!blockedId)
            return res.code(400).send(createResponse(400, 'BLOCKED_REQUIRED'));

        const userExists = await this.redis.sIsMember('userIds', `${blockedId}`);
        console.log('userExists value: ', userExists);
        if (!userExists || accountId === blockedId)
            return res.code(400).send(createResponse(400, 'BLOCKED_INVALID'));

        let blockExists = await this.redis.sIsMember(`blocker:${accountId}`, `${blockedId}`);
        if (!blockExists)
            return res.code(400).send(createResponse(400, 'BLOCK_NOT_FOUND'));

        await removeRestriction(this.db, accountId, blockedId);

        await this.redis.sRem(`blocker:${accountId}`, `${blockedId}`);
        await this.redis.sRem(`blocker:${blockedId}`, `${accountId}`);

        return res.code(200).send(createResponse(200, 'UNBLOCK_SUCCESS'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Get Block List
 */
export async function fetchRestrictions(req, res) {
    try {
        const accountId = req.user.id;

        const blockList = await fetchRestrictionList(this.db, accountId);

        return res.code(200).send(createResponse(200, 'BlOCK_LIST_FETCHED', { blockList: blockList }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Check Block Status
 */
export async function checkRestrictionStatus(req, res) {
    try {
        const accountId = req.user.id;

        const blockedId = parseInt(req.params.blockedId);
        if (!blockedId)
            return res.code(400).send(createResponse(400, 'BLOCKED_REQUIRED'));

        const userExists = await this.redis.sIsMember('userIds', `${blockedId}`);
        console.log('userExists value: ', userExists);
        if (!userExists || accountId === blockedId)
            return res.code(400).send(createResponse(400, 'BLOCKED_INVALID'));

        let isBlocked = await this.redis.sIsMember(`blocker:${accountId}`, `${blockedId}`);
        if (!isBlocked)
            isBlocked = await this.redis.sIsMember(`blocker:${blockedId}`, `${accountId}`);

        return res.code(200).send(createResponse(200, 'IS_BLOCKED', { isBlocked: isBlocked }));

    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}
