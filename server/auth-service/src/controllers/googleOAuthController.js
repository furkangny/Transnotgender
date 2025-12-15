/*
 * Google OAuth Controller
 * Handles Google OAuth2 authentication flow
 */

import { insertAccountWithOAuth, locateOAuthProvider, locateAccountByEmail, locateAccountById, connectOAuthToAccount } from "../models/accountRepository.js";
import { insertToken, locateValidTokenByAccountId } from "../models/tokenRepository.js";
import { createResponse, generateUsername } from "../utils/helpers.js";
import { setSessionCookies, clearSessionCookies } from "../utils/cookieManager.js";

// OAuth URLs
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/*
 * Initiate Google OAuth Flow
 */
export async function googleSetupHandler(req, res) {

    const authUrl = `${GOOGLE_AUTH_URL}?client_id=${process.env.GOOGLE_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=profile email&access_type=offline&prompt=consent`;
    res.redirect(authUrl);
}

/*
 * Handle Google OAuth Callback
 */
export async function googleLoginHandler(req, res) {

    try {
        clearSessionCookies(res);
        const { code } = req.query;
        if (!code)
            return res.redirect(process.env.FRONT_END_URL);
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_ID,
                client_secret: process.env.GOOGLE_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString()
        });

        console.log('Google tokens: ', tokenResponse);
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.log('Google tokens error: ', errorText);
            return res.redirect(process.env.FRONT_END_URL);
        }

        const { access_token, refresh_token } = await tokenResponse.json();
        const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const googleUserInfo = await userInfoResponse.json();
        console.log('User info: ', googleUserInfo);
        const oauthData = {
            provider: 'google',
            sub: googleUserInfo.sub,
            email: googleUserInfo.email,
            accessToken: access_token,
            refreshToken: refresh_token
        }

        let isNewUser = false;
        let account;
        const existingOAuth = await locateOAuthProvider(this.db, 'google', googleUserInfo.sub);
        if (existingOAuth) {
            account = await locateAccountById(this.db, existingOAuth.user_id);
            if (account)
                console.log('Already existing user with ID:', account.id);
        } else {
            account = await locateAccountByEmail(this.db, googleUserInfo.email);
            if (account) {
                console.log(`Existing user with ID : ${account.id} but not linked to google`);
                await connectOAuthToAccount(this.db, account.id, oauthData);
            }
            else {
                console.log('New User');
                isNewUser = true;
                const uniqueUserName = await generateUsername(this.db, googleUserInfo.given_name || googleUserInfo.email.split('@')[0]);
                const newAccountId = await insertAccountWithOAuth(this.db, {
                    username: uniqueUserName,
                    ...oauthData
                })
                account = await locateAccountById(this.db, newAccountId);
            }
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
        await this.redis.sAdd(`userIds`, `${account.id}`);

        if (isNewUser) {
            this.rabbit.produceMessage({
                type: 'INSERT',
                userId: account.id,
                username: account.username,
                email: account.email,
                avatar_url: googleUserInfo.picture
            }, 'profile.user.created');
        }

        return res.redirect(process.env.FRONT_END_URL);
    } catch (err) {
        console.log(err);
        return res.redirect(process.env.FRONT_END_URL);
    }
}