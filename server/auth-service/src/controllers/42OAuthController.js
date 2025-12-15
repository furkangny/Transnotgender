/*
 * 42 OAuth Controller
 * Handles 42 Intra OAuth authentication flow
 */

import {
    insertAccountWithOAuth,
    locateOAuthProvider,
    locateAccountByEmail,
    locateAccountById,
    connectOAuthToAccount
} from "../models/accountRepository.js";
import {
    insertToken,
    locateValidTokenByAccountId
} from "../models/tokenRepository.js";
import {
    createResponse,
    generateUsername
} from "../utils/helpers.js";
import {
    clearSessionCookies,
    setSessionCookies
} from "../utils/cookieManager.js";

// OAuth URLs
const INTRA_AUTH_URL = 'https://api.intra.42.fr/oauth/authorize';
const INTRA_TOKEN_URL = 'https://api.intra.42.fr/oauth/token';
const INTRA_USERINFO_URL = 'https://api.intra.42.fr/v2/me';

/*
 * Initiate 42 OAuth Flow
 */
export async function fortyTwoSetupHandler(req, res) {

    const authUrl = `${INTRA_AUTH_URL}?client_id=${process.env.FORTY_TWO_ID}&redirect_uri=${process.env.FORTY_TWO_REDIRECT_URI}&response_type=code`;
    res.redirect(authUrl);
}

/*
 * Handle 42 OAuth Callback
 */
export async function fortyTwoLoginHandler(req, res) {

    try {
        clearSessionCookies(res);
        const { code } = req.query;
        if (!code)
            return res.redirect(process.env.FRONT_END_URL);
        const tokenResponse = await fetch(INTRA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.FORTY_TWO_ID,
                client_secret: process.env.FORTY_TWO_SECRET,
                redirect_uri: process.env.FORTY_TWO_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString()
        });

        console.log('42 tokens: ', tokenResponse);
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.log('42 tokens error: ', errorText);
            return res.redirect(process.env.FRONT_END_URL);
        }

        const { access_token } = await tokenResponse.json();
        const userInfoResponse = await fetch(INTRA_USERINFO_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${access_token}` }
        });

        console.log('User info: ', userInfoResponse);
        const intraUserInfo = await userInfoResponse.json();
        console.log('User Info: ', intraUserInfo);
        const oauthData = {
            provider: '42',
            sub: intraUserInfo.id,
            email: intraUserInfo.email,
            accessToken: access_token,
            refreshToken: null
        }

        let isNewUser = false;
        let account;
        const existingOAuth = await locateOAuthProvider(this.db, '42', intraUserInfo.id);
        if (existingOAuth) {
            account = await locateAccountById(this.db, existingOAuth.user_id);
            if (account)
                console.log('Already existing user with ID:', account.id);
        } else {
            account = await locateAccountByEmail(this.db, intraUserInfo.email);
            if (account) {
                console.log(`Existing user with ID : ${account.id} but not linked to 42`);
                await connectOAuthToAccount(this.db, account.id, oauthData);
            }
            else {
                console.log('New User');
                isNewUser = true;
                const uniqueUserName = await generateUsername(this.db, intraUserInfo.login || intraUserInfo.email.split('@')[0]);
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
                avatar_url: intraUserInfo.image.link
            }, 'profile.user.created');
        }

        return res.redirect(process.env.FRONT_END_URL);
    } catch (err) {
        console.log(err);
        return res.redirect(process.env.FRONT_END_URL);
    }
}