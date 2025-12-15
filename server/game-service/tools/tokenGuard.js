/*
 * Token Guard Middleware
 * Validates JWT tokens for HTTP and WebSocket connections
 */
import jwt from 'jsonwebtoken';
import { createResponse } from './helpers.js';
import { parse } from 'cookie';


export function getSessionCookies(req) {
    const authCookies = req.headers.cookie || '';
    const parsedCookies = parse(authCookies);
    if (!parsedCookies || !parsedCookies.accessToken || !parsedCookies.refreshToken)
        return null;

    return {
        accessToken: parsedCookies.accessToken,
        refreshToken: parsedCookies.refreshToken
    };
}


export async function validateToken(req, res) {
    try {
        let sessionCookie = getSessionCookies(req);
        if (!sessionCookie)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));

        const tokenPayload = jwt.verify(sessionCookie.accessToken, process.env.AJWT_SECRET_KEY);
        const userExists = await this.redis.sIsMember('userIds', `${tokenPayload.id}`);
        if (!userExists)
            return res.code(401).send(createResponse(401, 'UNAUTHORIZED'));
        req.user = tokenPayload;
    } catch (err) {
        if (err.name === 'TokenExpiredError')
            return res.code(401).send(createResponse(401, 'ACCESS_TOKEN_EXPIRED'));
        return res.code(401).send(createResponse(401, 'ACCESS_TOKEN_INVALID'));
    }
}

export async function verifyWSToken(wsSocket, req, redisClient) {
    try {
        let sessionCookie = getSessionCookies(req);
        if (!sessionCookie) {
            wsSocket.close(3000, 'Unauthorized');
            return;
        }
        const tokenPayload = jwt.verify(sessionCookie.accessToken, process.env.AJWT_SECRET_KEY);

        const userExists = await redisClient.sIsMember('userIds', `${tokenPayload.id}`);
        if (!userExists) {
            wsSocket.close(3000, 'Unauthorized');
            return;
        }

        wsSocket.userId = tokenPayload.id;
        wsSocket.isAuthenticated = true;
    } catch (err) {
        console.log('WebSocket: ', err);
        wsSocket.close(1008, 'Token invalid');
    }
}
