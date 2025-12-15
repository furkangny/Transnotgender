/*
 * Email 2FA Controller
 * Handles email-based OTP verification
 */

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

// OTP code generation helper
const generateOtpCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

/*
 * Setup Email 2FA - Send OTP
 */
export async function setup2FAEmail(req, res) {

    try {
        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(400).send(createResponse(401, 'UNAUTHORIZED'));

        const otpCode = generateOtpCode();
        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, 'email');
        if (!mfaRecord)
            await storeOtpCode(this.db, otpCode, accountId);
        else {
            if (mfaRecord.enabled)
                return res.code(400).send(createResponse(400, 'TWOFA_ALREADY_ENABLED'));
            await modifyOtpCode(this.db, otpCode, account.id, mfaRecord.type);
        }

        await this.sendMail(otpCode, account.email);

        return res.code(200).send(createResponse(200, 'CODE_SENT'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Verify Email 2FA Setup
 */
export async function verify2FAEmailSetup(req, res) {

    try {

        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(400).send(createResponse(401, 'UNAUTHORIZED'));

        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, 'email');
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'TWOFA_ALREADY_ENABLED'));

        const { otpCode } = req.body;
        if (!otpCode)
            return res.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        console.log(`otpCode : ${mfaRecord.otp} | otp_exp : ${mfaRecord.otp_exp}`);
        if (mfaRecord.otp !== otpCode || mfaRecord.otp_exp < Date.now())
            return res.code(401).send(createResponse(401, 'OTP_INVALID'));

        await clearOtpCode(this.db, account.id, mfaRecord.type);
        await modifyAccountMfa(this.db, account.id, 'email');
        const hasPrimary = await locatePrimaryMfaByAccountId(this.db, account.id);
        if (!hasPrimary)
            await makeMfaPrimaryByAccountIdAndType(this.db, account.id, 'email');
        return res.code(200).send(createResponse(200, 'TWOFA_ENABLED', { isPrimary: (hasPrimary ? false : true) }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Verify Email 2FA for Login
 */
export async function verify2FALogin(req, res) {

    try {

        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(400).send(createResponse(401, 'UNAUTHORIZED'));

        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, 'email');
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (!mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_ENABLED'));

        const { otpCode } = req.body;
        if (!otpCode)
            return res.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        if (mfaRecord.otp !== otpCode || mfaRecord.otp_exp < Date.now())
            return res.code(401).send(createResponse(401, 'OTP_INVALID'));

        await clearOtpCode(this.db, account.id, mfaRecord.type);

        const accessToken = await this.jwt.signAT({ id: accountId });
        const existingToken = await locateValidTokenByAccountId(this.db, account.id);
        let refreshToken;
        if (existingToken) {
            refreshToken = existingToken.token;
        } else {
            refreshToken = this.jwt.signRT({ id: account.id });
            await insertToken(this.db, refreshToken, account.id);
        }
        clearSessionCookies(res);
        setSessionCookies(res, accessToken, refreshToken);
        return res.code(200).send(createResponse(200, 'USER_LOGGED_IN'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}