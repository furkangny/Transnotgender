/*
 * Two-Factor Authentication Controller
 * Manages 2FA methods settings
 */

import {
    disableMfaByAccountIdAndType,
    enableMfaByAccountIdAndType,
    locateMfaByAccountIdAndNotType,
    locateMfaByAccountIdAndType,
    fetchVerifiedMfaMethodsByAccountId,
    makeMfaPrimaryByAccountIdAndType
} from "../models/mfaRepository.js";
import { locateAccountById } from "../models/accountRepository.js";
import { createResponse } from "../utils/helpers.js";

/*
 * Get All 2FA Methods
 */
export async function getTwoFaHandler(req, res) {

    try {
        const accountId = req.user?.id;

        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const methods = await fetchVerifiedMfaMethodsByAccountId(this.db, account.id);
        if (!methods)
            return res.code(404).send(createResponse(404, 'NO_METHODS_FOUND'));
        return res.code(200).send(createResponse(200, 'METHODS_FETCHED', { methods }));
    } catch (err) {
        console.log('Error: ', err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Disable 2FA Method
 */
export async function disableTwoFa(req, res) {

    try {
        const accountId = req.user?.id;

        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const { method } = req.body;
        console.log('Method to be disabled: ', method);
        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, method);
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'METHOD_NOT_EXIST'));
        else {
            const otherMfaRecord = await locateMfaByAccountIdAndNotType(this.db, account.id, method);
            if (otherMfaRecord && otherMfaRecord.enabled)
                await makeMfaPrimaryByAccountIdAndType(this.db, account.id, otherMfaRecord.type);
        }
        console.log('MfaRecord: ', mfaRecord);
        if (!mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'METHOD_ALREADY_DISABLED'));
        await disableMfaByAccountIdAndType(this.db, account.id, method);
        return res.code(200).send(createResponse(200, 'METHOD_DISABLED'));
    } catch (err) {
        console.log('Error: ', err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Enable 2FA Method
 */
export async function enableTwoFa(req, res) {

    try {
        const accountId = req.user?.id;

        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const { method } = req.body;
        console.log('Method to be enabled: ', method);
        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, method);
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'METHOD_NOT_EXIST'));
        console.log('MfaRecord: ', mfaRecord);
        if (mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'METHOD_ALREADY_ENABLED'));

        await enableMfaByAccountIdAndType(this.db, account.id, method);
        return res.code(200).send(createResponse(200, 'METHOD_ENABLED'));
    } catch (err) {
        console.log('Error: ', err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Set Primary 2FA Method
 */
export async function makePrimaryHandler(req, res) {

    try {
        const accountId = req.user?.id;

        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const { method } = req.body;
        console.log('Method to be primary: ', method);
        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, method);
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'METHOD_NOT_EXIST'));
        console.log('MfaRecord: ', mfaRecord);
        if (!mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'METHOD_NOT_ENABLED'));

        await makeMfaPrimaryByAccountIdAndType(this.db, account.id, method);
        return res.code(200).send(createResponse(200, 'PRIMARY_METHOD_UPDATED'));
    } catch (err) {
        console.log('Error: ', err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}