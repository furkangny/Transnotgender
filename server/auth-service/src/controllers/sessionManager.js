/*
 * Session Manager Controller
 * Handles user authentication, registration and session operations
 */

import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import {
    locateAccount, 
    insertAccount, 
    locateAccountById, 
    locateAccountByEmail,
    modifyAccount,  
    modifyAccountEmail,
    removeAccount,
    removeOAuthProvider
} from '../models/accountRepository.js';
import { 
    locateToken,
    insertToken,
    invalidateToken,
    locateValidTokenByAccountId
} from '../models/tokenRepository.js'; 
import { 
    createResponse, 
    validatePassword 
} from '../utils/helpers.js'
import { 
    clearOtpCode,
    locatePrimaryMfaByAccountId, 
    locateMfaByAccountId, 
    storeOtpCode, 
    modifyOtpCode 
} from '../models/mfaRepository.js';
import { 
    clearSessionCookies,
    getSessionCookies, 
    setSessionCookies, 
    setTempSessionToken 
} from '../utils/cookieManager.js';
import { 
    removePendingChange, 
    fetchPendingChangeByAccountId, 
    insertPendingChange
} from '../models/pendingChangeRepository.js';

// Password hashing utilities
const hashPassword = bcrypt.hash;
const verifyPassword = bcrypt.compare;

// OTP code generation helper
const generateOtpCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

/*
 * Password Reset - Initiate
 */
export async function initiatePasswordReset(req, res) {
    
    try {
        clearSessionCookies(res);
        
        const { email } = req.body;
        
        const account = await locateAccountByEmail(this.db, email);
        if (!account)
            return res.code(400).send(createResponse(400, 'INVALID_EMAIL'));
        if (!account.password)
            return res.code(400).send(createResponse(400, 'USER_LINKED'));

        const otpCode = generateOtpCode();
        
        const mfaRecord = await locateMfaByAccountId(this.db, account.id);
        if (mfaRecord)
            await modifyOtpCode(this.db, otpCode, account.id, mfaRecord.type);
        else    
            await storeOtpCode(this.db, otpCode, account.id);
        await this.sendMail(otpCode, account.email);

        const tempToken = this.jwt.signTT({ id: account.id });
        setTempSessionToken(res, tempToken);
        return res.code(200).send(createResponse(200, 'CODE_SENT'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Password Reset - Verify OTP
 */
export async function confirmResetCode(req, res) {
    
    try {
        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));
        
        const mfaRecord = await locateMfaByAccountId(this.db, account.id);
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'CODE_NOT_SET'));

        const { otpCode } = req.body;
        if (!otpCode)
            return res.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        if (mfaRecord.otp !== otpCode || mfaRecord.otp_exp < Date.now())
            return res.code(401).send(createResponse(401, 'OTP_INVALID'));
        await clearOtpCode(this.db, account.id, mfaRecord.type);
        return res.code(200).send(createResponse(200, 'CODE_VERIFIED'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Password Reset - Change Password
 */
export async function changeUserPassword(req, res) {
    
    try {
        
        const accountId = req.user?.id;
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        if (!account.password)
            return res.code(400).send(createResponse(400, 'USER_LINKED'));

        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword)
            return res.code(400).send(createResponse(400, 'UNMATCHED_PASSWORDS'));
        if (!validatePassword(password))
            return res.code(400).send(createResponse(400, 'PASSWORD_POLICY'));

        const hashedPass = await hashPassword(password, 10);
        await modifyAccount(this.db, account.id, hashedPass);

        const mfaRecord = await locatePrimaryMfaByAccountId(this.db, account.id);
        if (mfaRecord && mfaRecord.enabled)
        {
            const tempToken = this.jwt.signTT({ id: account.id });
            if (mfaRecord.type === 'email')
            {
                const otpCode = generateOtpCode();
                await modifyOtpCode(this.db, otpCode, account.id, mfaRecord.type);
                await this.sendMail(otpCode, account.email);
            }
            clearSessionCookies(res);
            setTempSessionToken(res, tempToken);
            return res.code(206).send(createResponse(206, 'TWOFA_REQUIRED', { twoFaType: mfaRecord.type  }));
        }
        const accessToken = await this.jwt.signAT({ id: account.id });
        const existingToken = await locateValidTokenByAccountId(this.db, account.id);
        let refreshToken;
        if (existingToken) {
            refreshToken = existingToken.token;
        } else{
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

/*
 * User Login
 */
export async function authenticateUser(req, res) {
    
    try {
        clearSessionCookies(res);
        const { username, email, password } = req.body;
        const account = await locateAccount(this.db, username, email);
        if (!account)
            return res.code(400).send(createResponse(400, 'INVALID_CREDENTIALS'));

        if (!account.password)
            return res.code(400).send(createResponse(400, 'USER_ALREADY_LINKED'));
        const matched = await verifyPassword(password, account.password);
        if (!matched)
            return res.code(400).send(createResponse(400, 'INVALID_PASSWORD'));
        
        const mfaRecord = await locatePrimaryMfaByAccountId(this.db, account.id);
        if (mfaRecord && mfaRecord.enabled)
        {
            const tempToken = this.jwt.signTT({ id: account.id });
            if (mfaRecord.type === 'email')
            {
                const otpCode = generateOtpCode();
                await modifyOtpCode(this.db, otpCode, account.id, 'email');
                await this.sendMail(otpCode, account.email);
            }
            setTempSessionToken(res, tempToken);
            return res.code(206).send(createResponse(206, 'TWOFA_REQUIRED', { twoFaType: mfaRecord.type  }));
        }
        const accessToken = await this.jwt.signAT({ id: account.id });
        const existingToken = await locateValidTokenByAccountId(this.db, account.id);
        let refreshToken;
        if (existingToken) {
            refreshToken = existingToken.token;
        } else {
            refreshToken = this.jwt.signRT({ id: account.id });
            await insertToken(this.db, refreshToken, account.id);
        }
        setSessionCookies(res, accessToken, refreshToken);
        return res.code(200).send(createResponse(200, 'USER_LOGGED_IN'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * User Registration
 */
export async function createAccount(req, res) {
    
    try {
        const { email, username, password, confirmPassword, gender} = req.body;
        if (password !== confirmPassword)
            return res.code(400).send(createResponse(400, 'UNMATCHED_PASSWORDS'));
        if (!validatePassword(password))
            return res.code(400).send(createResponse(400, 'PASSWORD_POLICY'));
        const accountExists = await locateAccount(this.db, username, email);
        if (accountExists)
            return res.code(400).send(createResponse(400, 'USER_EXISTS'));
        
        const hashedPass = await hashPassword(password, 10);
        const newAccountId = await insertAccount(this.db, username, email, hashedPass);
        
        await this.redis.sAdd(`userIds`, `${newAccountId}`);
        this.rabbit.produceMessage({
            type: 'INSERT',
            userId: newAccountId,
            username: username,
            email: email,
            gender: gender
        },
        'profile.user.created'
        );
        
        return res.code(201).send(createResponse(201, 'USER_REGISTERED'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * User Logout
 */
export async function terminateSession(req, res) {
    
    try {
        clearSessionCookies(res);
        const accountId = req.user?.id;
        
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));
        
        const tokens = getSessionCookies(req);        
        if (!tokens.refreshToken)
            return res.code(401).send(createResponse(401, 'REFRESH_TOKEN_REQUIRED'));
        
        const tokenRecord = await locateToken(this.db, tokens.refreshToken);
        if (!tokenRecord || tokenRecord.revoked)
            return res.code(401).send(createResponse(401, 'REFRESH_TOKEN_INVALID'));
        
        await invalidateToken(this.db, tokens.refreshToken);
        return res.code(200).send(createResponse(200, 'USER_LOGGED_OUT'));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Get Current User Info
 */
export async function fetchCurrentUser(req, res) {
    
    try {
        const accountId = req.user?.id;
        
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));
        
        return res.code(200).send(createResponse(200, 'USER_FETCHED', { id: account.id, username: account.username, email: account.email }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Refresh Access Token
 */
export async function renewAccessToken(req, res) {
    
    try {
        const tokens = getSessionCookies(req);
        if (!tokens.refreshToken)
            return res.code(401).send(createResponse(401, 'REFRESH_TOKEN_REQUIRED'));
        
        const tokenRecord = await locateToken(this.db, tokens.refreshToken);
        if (!tokenRecord || tokenRecord.revoked)
            return res.code(401).send(createResponse(401, 'REFRESH_TOKEN_INVALID'));

        const tokenPayload = await this.jwt.verifyRT(tokenRecord.token);

        await invalidateToken(this.db, tokenRecord.token);

        const accessToken = await this.jwt.signAT({ id: tokenPayload.id });
        const newRefreshToken = this.jwt.signRT({ id: tokenPayload.id });

        await insertToken(this.db, newRefreshToken, tokenPayload.id);
        setSessionCookies(res, accessToken, newRefreshToken);
        return res.code(200).send(createResponse(200, 'TOKEN_REFRESHED'));
    } catch (err) {
        if (err.name === 'TokenExpiredError')
            return res.code(401).send(createResponse(401, 'REFRESH_TOKEN_EXPIRED'));
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Update User Credentials (Email/Password)
 */
export async function modifyCredentials(req, res) {
    
    const accountId = req.user?.id;
    const { email, oldPassword, newPassword, confirmNewPassword } = req.body;
    try {
        
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        let updateField = "";
        
        let hashedPass = null;
        if (newPassword || confirmNewPassword || oldPassword) {
            if (!newPassword || !confirmNewPassword || !oldPassword)
                return res.code(400).send(createResponse(400, 'PASSWORDS_REQUIRED'));
            if (newPassword === oldPassword)
                return res.code(400).send(createResponse(400, 'SAME_PASSWORD'));
            let matched = await verifyPassword(oldPassword, account.password);
            if (!matched)
                return res.code(400).send(createResponse(400, 'INVALID_PASSWORD'));
            if (newPassword !== confirmNewPassword)
                return res.code(400).send(createResponse(400, 'UNMATCHED_PASSWORDS'));
            if (!validatePassword(newPassword))
                return res.code(400).send(createResponse(400, 'PASSWORD_POLICY'));
            hashedPass = await hashPassword(newPassword, 10);
            updateField = "password";
        }



        const mfaRecord = await locatePrimaryMfaByAccountId(this.db, account.id);
        if (mfaRecord && mfaRecord.enabled)
        {
            if (mfaRecord.type === 'email')
            {
                const otpCode = generateOtpCode();
                await modifyOtpCode(this.db, otpCode, account.id, 'email');
                await this.sendMail(otpCode, account.email);
            }
            await insertPendingChange(this.db, account.id, email, hashedPass);
            return res.code(206).send(createResponse(206, 'TWOFA_REQUIRED', { twoFaType: mfaRecord.type  }));
        }

        if (email) {
            updateField = "email";
            const emailExists = await locateAccountByEmail(this.db, email);
            if (emailExists)
                return res.code(400).send(createResponse(400, 'EMAIL_EXISTS'));
            this.rabbit.produceMessage({
                type: 'UPDATE',
                userId: account.id,
                email: email
            }, 'profile.email.updated')

            await modifyAccountEmail(this.db, email, account.id);
        }
        if (hashedPass)
            await modifyAccount(this.db, account.id, hashedPass);

        return res.code(200).send(createResponse(200, 'CREDENTIALS_UPDATED', { type: updateField }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Verify 2FA for Credential Change
 */
export async function confirmCredentialChange(req, res) {
    
    const accountId = req.user?.id;
    try {
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const pendingCreds = await fetchPendingChangeByAccountId(this.db, account.id);
        if (!pendingCreds)
            return res.code(400).send(createResponse(400, 'NO PENDING_CREDENTIALS'));
        
        const mfaRecord = await locatePrimaryMfaByAccountId(this.db, account.id);
        if (!mfaRecord)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (!mfaRecord.enabled)
            return res.code(400).send(createResponse(400, 'TWOFA_NOT_ENABLED'));
        
        const { otpCode } = req.body;
        if (!otpCode)
            return res.code(401).send(createResponse(401, 'OTP_REQUIRED'));
        
        if (mfaRecord.type === 'email') {
            if (mfaRecord.otp !== otpCode || mfaRecord.otp_exp < Date.now())
                return res.code(401).send(createResponse(401, 'OTP_INVALID'));
        } else {
            const isValid = speakeasy.totp.verify({
                secret: mfaRecord.secret,
                encoding: 'base32',
                token: otpCode,
                window: 1
            })
            if (!isValid)
                return res.code(401).send(createResponse(401, 'OTP_INVALID'));
        }
        await clearOtpCode(this.db, account.id, mfaRecord.type);

        let updateField = "";
        if (pendingCreds.new_email) {
            updateField = "email";
            const emailExists = await locateAccountByEmail(this.db, pendingCreds.new_email);
            if (emailExists)
                return res.code(400).send(createResponse(400, 'EMAIL_EXISTS'));
            this.rabbit.produceMessage({
                type: 'UPDATE',
                userId: account.id,
                email: pendingCreds.new_email
            }, 'profile.email.updated');
            await modifyAccountEmail(this.db, pendingCreds.new_email, account.id);
        } else if (pendingCreds.new_password) {
            updateField = "password";
            await modifyAccount(this.db, account.id, pendingCreds.new_password);
        }

        await removePendingChange(this.db, account.id);
        
        return res.code(200).send(createResponse(200, 'CREDENTIALS_UPDATED', { type: updateField }));
    } catch (err) {
        console.log(err); 
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));        
    }
}

/*
 * Delete User Account
 */
export async function removeUserAccount(req, res) {
    
    const accountId = req.user?.id;
    try {
        const account = await locateAccountById(this.db, accountId);
        if (!account)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        // Notify all services about account deletion
        const serviceTargets = ['profile', 'chat', 'notifications', 'relationships'];
        for (const target of serviceTargets) {
            this.rabbit.produceMessage({
                type: 'DELETE',
                userId: account.id
            }, `${target}.user.deleted`);
        }
        await removeAccount(this.db, account.id);
        await removeOAuthProvider(this.db, account.id);
        await this.redis.sRem(`userIds`, `${account.id}`);
        clearSessionCookies(res);

        return res.code(200).send(createResponse(200, 'USER_DATA_DELETED'));
    } catch (err) {
        console.log(err); 
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));        
    }
}
