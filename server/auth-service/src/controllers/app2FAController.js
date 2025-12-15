/*
 * App 2FA Controller
 * Handles TOTP authenticator app based 2FA
 */

import QRCode from 'qrcode'
import speakeasy from 'speakeasy'
import { locateAccountById } from '../models/accountRepository.js';
import { insertToken, locateValidTokenByAccountId } from '../models/tokenRepository.js';
import { createResponse } from '../utils/helpers.js';
import {
    locatePrimaryMfaByAccountId,
    locateMfaByAccountIdAndType,
    makeMfaPrimaryByAccountIdAndType,
    storeTempSecret,
    modifyTempSecret,
    modifyAccountMfa,
    modifyAccountSecret
} from '../models/mfaRepository.js';
import { clearSessionCookies, setSessionCookies } from '../utils/cookieManager.js';

/*
 * Setup 2FA App - Generate QR Code
 */
export async function setup2FAApp(req, res) {

    try {
        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const secret = speakeasy.generateSecret({
            name: `BEE Club (${account.username})`,
            length: 32
        });
        const otpauthUrl = secret.otpauth_url;
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, 'app');
        if (!mfaRecord)
            await storeTempSecret(this.db, secret.base32, qrCodeUrl, accountId);
        else {
            if (mfaRecord.temp_secret)
                return res.code(400).send(createResponse(400, 'TWOFA_ALREADY_PENDING', { qrCode: mfaRecord.qrcode_url }));
            if (mfaRecord.enabled && mfaRecord.type === 'app')
                return res.code(400).send(createResponse(400, 'TWOFA_ALREADY_ENABLED'));
            await modifyTempSecret(this.db, secret.base32, account.id);
        }

        return res.code(200).send(createResponse(200, 'SCAN_QR', { qrCode: qrCodeUrl }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Verify 2FA App Setup
 */
export async function verify2FAAppSetup(req, res) {

    try {

        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, 'app');
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'TWOFA_ALREADY_ENABLED'));

        const { otpCode } = req.body;
        if (!otpCode)
            return res.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        const isValid = speakeasy.totp.verify({
            secret: mfaRecord.temp_secret,
            encoding: 'base32',
            token: otpCode,
            window: 1
        })
        if (!isValid)
            return res.code(401).send(createResponse(401, 'OTP_INVALID'));

        await modifyAccountMfa(this.db, account.id, 'app');
        await modifyAccountSecret(this.db, account.id);
        const hasPrimary = await locatePrimaryMfaByAccountId(this.db, account.id);
        if (!hasPrimary)
            await makeMfaPrimaryByAccountIdAndType(this.db, account.id, 'app');

        return res.code(200).send(createResponse(200, 'TWOFA_ENABLED', { isPrimary: (hasPrimary ? false : true) }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Verify 2FA App for Login
 */
export async function verify2FAAppLogin(req, res) {

    try {

        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const mfaRecord = await locateMfaByAccountIdAndType(this.db, account.id, 'app');
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (!mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_ENABLED'));

        const { otpCode } = req.body;
        if (!otpCode)
            return res.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        const isValid = speakeasy.totp.verify({
            secret: mfaRecord.secret,
            encoding: 'base32',
            token: otpCode,
            window: 1
        })
        if (!isValid)
            return res.code(401).send(createResponse(401, 'OTP_INVALID'));

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