/*
 * Token Guard Middleware
 * Validates JWT tokens for WebSocket connections
 */
import jwt from 'jsonwebtoken';
import { parse } from 'cookie'

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


export async function validateToken(wsSocket, req, redisClient) {
    try {
        let sessionCookie = getSessionCookies(req);
        if (!sessionCookie) {
            wsSocket.close(3000, 'Unauthorized');
            return;
        }

        const tokenPayload = jwt.verify(sessionCookie.accessToken, process.env.AJWT_SECRET_KEY);

        const userExists = await redisClient.sIsMember('userIds', `${tokenPayload.id}`);
        console.log('userExists value: ', userExists);
        if (!userExists) {
            wsSocket.close(3000, 'Unauthorized');
            return;
        }

        wsSocket.userId = tokenPayload.id;
        wsSocket.isAuthenticated = true;
        console.log(`WebSocket: User ${wsSocket.userId} authenticated`);
    } catch (err) {
        console.log('WebSocket: ', err);
        wsSocket.close(1008, 'Token invalid');
    }
}
