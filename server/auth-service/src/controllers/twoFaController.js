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

export async function getTwoFaHandler(request, reply) {

    try {
        const userId = request.user?.id;

        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const methods = await fetchVerifiedMfaMethodsByAccountId(this.db, user.id);
        if (!methods)
            return reply.code(404).send(createResponse(404, 'NO_METHODS_FOUND'));
        return reply.code(200).send(createResponse(200, 'METHODS_FETCHED', { methods }));
    } catch (error) {
        console.log('Error: ', error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function disableTwoFa(request, reply) {

    try {
        const userId = request.user?.id;

        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const { method } = request.body;
        console.log('Method to be disabled: ', method);
        const twoFa = await locateMfaByAccountIdAndType(this.db, user.id, method);
        if (!twoFa)
            return reply.code(400).send(createResponse(400, 'METHOD_NOT_EXIST'));
        else {
            const otherTwoFa = await locateMfaByAccountIdAndNotType(this.db, user.id, method);
            if (otherTwoFa && otherTwoFa.enabled)
                await makeMfaPrimaryByAccountIdAndType(this.db, user.id, otherTwoFa.type);
        }
        console.log('TwoFa: ', twoFa);
        if (!twoFa.enabled)
            return reply.code(400).send(createResponse(400, 'METHOD_ALREADY_DISABLED'));
        await disableMfaByAccountIdAndType(this.db, user.id, method);
        return reply.code(200).send(createResponse(200, 'METHOD_DISABLED'));
    } catch (error) {
        console.log('Error: ', error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function enableTwoFa(request, reply) {

    try {
        const userId = request.user?.id;

        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const { method } = request.body;
        console.log('Method to be enabled: ', method);
        const twoFa = await locateMfaByAccountIdAndType(this.db, user.id, method);
        if (!twoFa)
            return reply.code(400).send(createResponse(400, 'METHOD_NOT_EXIST'));
        console.log('TwoFa: ', twoFa);
        if (twoFa.enabled)
            return reply.code(400).send(createResponse(400, 'METHOD_ALREADY_ENABLED'));

        await enableMfaByAccountIdAndType(this.db, user.id, method);
        return reply.code(200).send(createResponse(200, 'METHOD_ENABLED'));
    } catch (error) {
        console.log('Error: ', error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function makePrimaryHandler(request, reply) {

    try {
        const userId = request.user?.id;

        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const { method } = request.body;
        console.log('Method to be primary: ', method);
        const twoFa = await locateMfaByAccountIdAndType(this.db, user.id, method);
        if (!twoFa)
            return reply.code(400).send(createResponse(400, 'METHOD_NOT_EXIST'));
        console.log('TwoFa: ', twoFa);
        if (!twoFa.enabled)
            return reply.code(400).send(createResponse(400, 'METHOD_NOT_ENABLED'));

        await makeMfaPrimaryByAccountIdAndType(this.db, user.id, method);
        return reply.code(200).send(createResponse(200, 'PRIMARY_METHOD_UPDATED'));
    } catch (error) {
        console.log('Error: ', error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}