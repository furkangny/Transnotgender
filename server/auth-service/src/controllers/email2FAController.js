import {
    insertToken,
    locateValidTokenByAccountId
} from '../models/tokenRepository.js';
import {
    clearOtpCode,
    locatePrimaryMfaByAccountId,
    locateMfaByAccountIdAndType,
    makeMfaPrimaryByAccountIdAndType,
    storeOtpCode,
    modifyOtpCode,
    modifyAccountMfa
} from '../models/mfaRepository.js';
import { locateAccountById } from '../models/accountRepository.js';
import { clearSessionCookies, setSessionCookies } from '../utils/cookieManager.js';
import { createResponse } from '../utils/helpers.js';

export async function setup2FAEmail(request, reply) {

    try {
        const userId = request.user?.id;
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(400).send(createResponse(401, 'UNAUTHORIZED'));

        const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`
        const twoFa = await locateMfaByAccountIdAndType(this.db, user.id, 'email');
        if (!twoFa)
            await storeOtpCode(this.db, otpCode, userId);
        else {
            if (twoFa.enabled)
                return reply.code(400).send(createResponse(400, 'TWOFA_ALREADY_ENABLED'));
            await modifyOtpCode(this.db, otpCode, user.id, twoFa.type);
        }

        await this.sendMail(otpCode, user.email);

        return reply.code(200).send(createResponse(200, 'CODE_SENT'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function verify2FAEmailSetup(request, reply) {

    try {

        const userId = request.user?.id;
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(400).send(createResponse(401, 'UNAUTHORIZED'));

        const twoFa = await locateMfaByAccountIdAndType(this.db, user.id, 'email');
        if (!twoFa)
            return reply.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (twoFa.enabled)
            return reply.code(400).send(createResponse(400, 'TWOFA_ALREADY_ENABLED'));

        const { otpCode } = request.body;
        if (!otpCode)
            return reply.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        console.log(`otpCode : ${twoFa.otp} | otp_exp : ${twoFa.otp_exp}`);
        if (twoFa.otp !== otpCode || twoFa.otp_exp < Date.now())
            return reply.code(401).send(createResponse(401, 'OTP_INVALID'));

        await clearOtpCode(this.db, user.id, twoFa.type);
        await modifyAccountMfa(this.db, user.id, 'email');
        const hasPrimary = await locatePrimaryMfaByAccountId(this.db, user.id);
        if (!hasPrimary)
            await makeMfaPrimaryByAccountIdAndType(this.db, user.id, 'email');
        return reply.code(200).send(createResponse(200, 'TWOFA_ENABLED', { isPrimary: (hasPrimary ? false : true) }));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function verify2FALogin(request, reply) {

    try {

        const userId = request.user?.id;
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(400).send(createResponse(401, 'UNAUTHORIZED'));

        const twoFa = await locateMfaByAccountIdAndType(this.db, user.id, 'email');
        if (!twoFa)
            return reply.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (!twoFa.enabled)
            return reply.code(400).send(createResponse(400, 'TWOFA_NOT_ENABLED'));

        const { otpCode } = request.body;
        if (!otpCode)
            return reply.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        if (twoFa.otp !== otpCode || twoFa.otp_exp < Date.now())
            return reply.code(401).send(createResponse(401, 'OTP_INVALID'));

        await clearOtpCode(this.db, user.id, twoFa.type);

        const accessToken = await this.jwt.signAT({ id: userId });
        const tokenExist = await locateValidTokenByAccountId(this.db, user.id);
        let refreshToken;
        if (tokenExist) {
            refreshToken = tokenExist.token;
        } else {
            refreshToken = this.jwt.signRT({ id: user.id });
            await insertToken(this.db, refreshToken, user.id);
        }
        clearSessionCookies(reply);
        setSessionCookies(reply, accessToken, refreshToken);
        return reply.code(200).send(createResponse(200, 'USER_LOGGED_IN'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}