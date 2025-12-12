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

const hash = bcrypt.hash;
const compare = bcrypt.compare;

export async function initiatePasswordReset(request, reply) {
    
    try {
        clearSessionCookies(reply);
        
        const { email } = request.body;
        
        const user = await locateAccountByEmail(this.db, email);
        if (!user)
            return reply.code(400).send(createResponse(400, 'INVALID_EMAIL'));
        if (!user.password)
            return reply.code(400).send(createResponse(400, 'USER_LINKED'));

        const otpCode = `${Math.floor(100000 + Math.random() * 900000) }`
        
        const twoFa = await locateMfaByAccountId(this.db, user.id);
        if (twoFa)
            await modifyOtpCode(this.db, otpCode, user.id, twoFa.type);
        else    
            await storeOtpCode(this.db, otpCode, user.id);
        await this.sendMail(otpCode, user.email);

        const tempToken = this.jwt.signTT({ id: user.id });
        setTempSessionToken(reply, tempToken);
        return reply.code(200).send(createResponse(200, 'CODE_SENT'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function confirmResetCode(request, reply) {
    
    try {
        const userId = request.user?.id;
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));
        
        const twoFa = await locateMfaByAccountId(this.db, user.id);
        if (!twoFa)
            return reply.code(400).send(createResponse(400, 'CODE_NOT_SET'));

        const { otpCode } = request.body;
        if (!otpCode)
            return reply.code(401).send(createResponse(401, 'OTP_REQUIRED'));

        if (twoFa.otp !== otpCode || twoFa.otp_exp < Date.now())
            return reply.code(401).send(createResponse(401, 'OTP_INVALID'));
        await clearOtpCode(this.db, user.id, twoFa.type);
        return reply.code(200).send(createResponse(200, 'CODE_VERIFIED'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function changeUserPassword(request, reply) {
    
    try {
        
        const userId = request.user?.id;
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        if (!user.password)
            return reply.code(400).send(createResponse(400, 'USER_LINKED'));

        const { password, confirmPassword } = request.body;

        if (password !== confirmPassword)
            return reply.code(400).send(createResponse(400, 'UNMATCHED_PASSWORDS'));
        if (!validatePassword(password))
            return reply.code(400).send(createResponse(400, 'PASSWORD_POLICY'));

        const hashedPassword = await hash(password, 10);
        await modifyAccount(this.db, user.id, hashedPassword);

        const twoFa = await locatePrimaryMfaByAccountId(this.db, user.id);
        if (twoFa && twoFa.enabled)
        {
            const tempToken = this.jwt.signTT({ id: user.id });
            if (twoFa.type === 'email')
            {
                const otpCode = `${Math.floor(100000 + Math.random() * 900000) }`
                await modifyOtpCode(this.db, otpCode, user.id, twoFa.type);
                await this.sendMail(otpCode, user.email);
            }
            clearSessionCookies(reply);
            setTempSessionToken(reply, tempToken);
            return reply.code(206).send(createResponse(206, 'TWOFA_REQUIRED', { twoFaType: twoFa.type  }));
        }
        const accessToken = await this.jwt.signAT({ id: user.id });
        const tokenExist = await locateValidTokenByAccountId(this.db, user.id);
        let refreshToken;
        if (tokenExist) {
            refreshToken = tokenExist.token;
        } else{
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

export async function authenticateUser(request, reply) {
    
    try {
        clearSessionCookies(reply);
        const { username, email, password } = request.body;
        const user = await locateAccount(this.db, username, email);
        if (!user)
            return reply.code(400).send(createResponse(400, 'INVALID_CREDENTIALS'));

        if (!user.password)
            return reply.code(400).send(createResponse(400, 'USER_ALREADY_LINKED'));
        const matched = await compare(password, user.password);
        if (!matched)
            return reply.code(400).send(createResponse(400, 'INVALID_PASSWORD'));
        
        const twoFa = await locatePrimaryMfaByAccountId(this.db, user.id);
        if (twoFa && twoFa.enabled)
        {
            const tempToken = this.jwt.signTT({ id: user.id });
            if (twoFa.type === 'email')
            {
                const otpCode = `${Math.floor(100000 + Math.random() * 900000) }`
                await modifyOtpCode(this.db, otpCode, user.id, 'email');
                await this.sendMail(otpCode, user.email);
            }
            setTempSessionToken(reply, tempToken);
            return reply.code(206).send(createResponse(206, 'TWOFA_REQUIRED', { twoFaType: twoFa.type  }));
        }
        const accessToken = await this.jwt.signAT({ id: user.id });
        const tokenExist = await locateValidTokenByAccountId(this.db, user.id);
        let refreshToken;
        if (tokenExist) {
            refreshToken = tokenExist.token;
        } else {
            refreshToken = this.jwt.signRT({ id: user.id });
            await insertToken(this.db, refreshToken, user.id);
        }
        setSessionCookies(reply, accessToken, refreshToken);
        return reply.code(200).send(createResponse(200, 'USER_LOGGED_IN'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function createAccount(request, reply) {
    
    try {
        const { email, username, password, confirmPassword, gender} = request.body;
        if (password !== confirmPassword)
            return reply.code(400).send(createResponse(400, 'UNMATCHED_PASSWORDS'));
        if (!validatePassword(password))
            return reply.code(400).send(createResponse(400, 'PASSWORD_POLICY'));
        const userExist = await locateAccount(this.db, username, email);
        if (userExist)
            return reply.code(400).send(createResponse(400, 'USER_EXISTS'));
        
        const hashedPassword = await hash(password, 10);
        const userId = await insertAccount(this.db, username, email, hashedPassword);
        
        await this.redis.sAdd(`userIds`, `${userId}`);
        this.rabbit.produceMessage({
            type: 'INSERT',
            userId: userId,
            username: username,
            email: email,
            gender: gender
        },
        'profile.user.created'
        );
        
        return reply.code(201).send(createResponse(201, 'USER_REGISTERED'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function terminateSession(request, reply) {
    
    try {
        clearSessionCookies(reply);
        const userId = request.user?.id;
        
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));
        
        const tokens = getSessionCookies(request);        
        if (!tokens.refreshToken)
            return reply.code(401).send(createResponse(401, 'REFRESH_TOKEN_REQUIRED'));
        
        const tokenExist = await locateToken(this.db, tokens.refreshToken);
        if (!tokenExist || tokenExist.revoked)
            return reply.code(401).send(createResponse(401, 'REFRESH_TOKEN_INVALID'));
        
        await invalidateToken(this.db, tokens.refreshToken);
        return reply.code(200).send(createResponse(200, 'USER_LOGGED_OUT'));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function fetchCurrentUser(request, reply) {
    
    try {
        const userId = request.user?.id;
        
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));
        
        return reply.code(200).send(createResponse(200, 'USER_FETCHED', { id: user.id, username: user.username, email: user.email }));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function renewAccessToken(request, reply) {
    
    try {
        const tokens = getSessionCookies(request);
        if (!tokens.refreshToken)
            return reply.code(401).send(createResponse(401, 'REFRESH_TOKEN_REQUIRED'));
        
        const tokenExist = await locateToken(this.db, tokens.refreshToken);
        if (!tokenExist || tokenExist.revoked)
            return reply.code(401).send(createResponse(401, 'REFRESH_TOKEN_INVALID'));

        const payload = await this.jwt.verifyRT(tokenExist.token);

        await invalidateToken(this.db, tokenExist.token);

        const accessToken = await this.jwt.signAT({ id: payload.id });
        const newRefreshToken = this.jwt.signRT({ id: payload.id });

        await insertToken(this.db, newRefreshToken, payload.id);
        setSessionCookies(reply, accessToken, newRefreshToken);
        return reply.code(200).send(createResponse(200, 'TOKEN_REFRESHED'));
    } catch (error) {
        if (error.name === 'TokenExpiredError')
            return reply.code(401).send(createResponse(401, 'REFRESH_TOKEN_EXPIRED'));
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}


export async function modifyCredentials(request, reply) {
    
    const userId = request.user?.id;
    const { email, oldPassword, newPassword, confirmNewPassword } = request.body;
    try {
        
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        let toUpdate = "";
        
        let hashedPassword = null;
        if (newPassword || confirmNewPassword || oldPassword) {
            if (!newPassword || !confirmNewPassword || !oldPassword)
                return reply.code(400).send(createResponse(400, 'PASSWORDS_REQUIRED'));
            if (newPassword === oldPassword)
                return reply.code(400).send(createResponse(400, 'SAME_PASSWORD'));
            let matched = await compare(oldPassword, user.password);
            if (!matched)
                return reply.code(400).send(createResponse(400, 'INVALID_PASSWORD'));
            if (newPassword !== confirmNewPassword)
                return reply.code(400).send(createResponse(400, 'UNMATCHED_PASSWORDS'));
            if (!validatePassword(newPassword))
                return reply.code(400).send(createResponse(400, 'PASSWORD_POLICY'));
            hashedPassword = await hash(newPassword, 10);
            toUpdate = "password";
        }



        const twoFa = await locatePrimaryMfaByAccountId(this.db, user.id);
        if (twoFa && twoFa.enabled)
        {
            if (twoFa.type === 'email')
            {
                const otpCode = `${Math.floor(100000 + Math.random() * 900000) }`
                await modifyOtpCode(this.db, otpCode, user.id, 'email');
                await this.sendMail(otpCode, user.email);
            }
            await insertPendingChange(this.db, user.id, email, hashedPassword);
            return reply.code(206).send(createResponse(206, 'TWOFA_REQUIRED', { twoFaType: twoFa.type  }));
        }

        if (email) {
            toUpdate = "email";
            const emailExist = await locateAccountByEmail(this.db, email);
            if (emailExist)
                return reply.code(400).send(createResponse(400, 'EMAIL_EXISTS'));
            this.rabbit.produceMessage({
                type: 'UPDATE',
                userId: user.id,
                email: email
            }, 'profile.email.updated')

            await modifyAccountEmail(this.db, email, user.id);
        }
        if (hashedPassword)
            await modifyAccount(this.db, user.id, hashedPassword);

        return reply.code(200).send(createResponse(200, 'CREDENTIALS_UPDATED', { type: toUpdate }));
    } catch (error) {
        console.log(error);
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

export async function confirmCredentialChange(request, reply) {
    
    const userId = request.user?.id;
    try {
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const pending_credentials = await fetchPendingChangeByAccountId(this.db, user.id);
        if (!pending_credentials)
            return reply.code(400).send(createResponse(400, 'NO PENDING_CREDENTIALS'));
        
        const twoFa = await locatePrimaryMfaByAccountId(this.db, user.id);
        if (!twoFa)
            return reply.code(400).send(createResponse(400, 'TWOFA_NOT_SET'));
        else if (!twoFa.enabled)
            return reply.code(400).send(createResponse(400, 'TWOFA_NOT_ENABLED'));
        
        const { otpCode } = request.body;
        if (!otpCode)
            return reply.code(401).send(createResponse(401, 'OTP_REQUIRED'));
        
        if (twoFa.type === 'email') {
            if (twoFa.otp !== otpCode || twoFa.otp_exp < Date.now())
                return reply.code(401).send(createResponse(401, 'OTP_INVALID'));
        } else {
            const isValid = speakeasy.totp.verify({
                secret: twoFa.secret,
                encoding: 'base32',
                token: otpCode,
                window: 1
            })
            if (!isValid)
                return reply.code(401).send(createResponse(401, 'OTP_INVALID'));
        }
        await clearOtpCode(this.db, user.id, twoFa.type);

        let toUpdate = "";
        if (pending_credentials.new_email) {
            toUpdate = "email";
            const emailExist = await locateAccountByEmail(this.db, pending_credentials.new_email);
            if (emailExist)
                return reply.code(400).send(createResponse(400, 'EMAIL_EXISTS'));
            this.rabbit.produceMessage({
                type: 'UPDATE',
                userId: user.id,
                email: pending_credentials.new_email
            }, 'profile.email.updated');
            await modifyAccountEmail(this.db, pending_credentials.new_email, user.id);
        } else if (pending_credentials.new_password) {
            toUpdate = "password";
            await modifyAccount(this.db, user.id, pending_credentials.new_password);
        }

        await removePendingChange(this.db, user.id);
        
        return reply.code(200).send(createResponse(200, 'CREDENTIALS_UPDATED', { type: toUpdate }));
    } catch (error) {
        console.log(error); 
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));        
    }
}

export async function removeUserAccount(request, reply) {
    
    const userId = request.user?.id;
    try {
        const user = await locateAccountById(this.db, userId);
        if (!user)
            return reply.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const targets = ['profile', 'chat', 'notifications', 'relationships'];
        for (const target of targets) {
            this.rabbit.produceMessage({
                type: 'DELETE',
                userId: user.id
            }, `${target}.user.deleted`);
        }
        await removeAccount(this.db, user.id);
        await removeOAuthProvider(this.db, user.id);
        await this.redis.sRem(`userIds`, `${user.id}`);
        clearSessionCookies(reply);

        return reply.code(200).send(createResponse(200, 'USER_DATA_DELETED'));
    } catch (error) {
        console.log(error); 
        return reply.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));        
    }
}
