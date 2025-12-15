/*
 * Cookie Manager - Session Handling
 * Manages authentication cookies
 */
import { serialize, parse } from 'cookie'

// Cookie configuration
const COOKIE_CONFIG = {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/'
}

// Time constants (in seconds)
const ACCESS_TOKEN_TTL = 60 * 15;      // 15 minutes
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7;  // 7 days
const TEMP_TOKEN_TTL = 60 * 5;         // 5 minutes

export function setSessionCookies(res, accessToken, refreshToken) {
    const accessCookie = serialize('accessToken', accessToken, {
        ...COOKIE_CONFIG,
        maxAge: ACCESS_TOKEN_TTL
    });

    const refreshCookie = serialize('refreshToken', refreshToken, {
        ...COOKIE_CONFIG,
        maxAge: REFRESH_TOKEN_TTL
    });

    res.header('Set-Cookie', [accessCookie, refreshCookie]);
}

export function setTempSessionToken(res, tempToken) {
    const tempCookie = serialize('tempToken', tempToken, {
        ...COOKIE_CONFIG,
        maxAge: TEMP_TOKEN_TTL
    });
    res.header('Set-Cookie', tempCookie);
}

export function clearTempSessionToken(res) {
    const tempCookie = serialize('tempToken', '', {
        ...COOKIE_CONFIG,
        maxAge: 0
    });
    res.header('Set-Cookie', tempCookie);
}

export function getTempSessionToken(req) {
    const cookieHeader = req.headers.cookie || '';
    const parsedCookies = parse(cookieHeader);
    return parsedCookies.tempToken;
}

export function clearSessionCookies(res) {
    const accessCookie = serialize('accessToken', '', {
        ...COOKIE_CONFIG,
        maxAge: 0
    });

    const tempCookie = serialize('tempToken', '', {
        ...COOKIE_CONFIG,
        maxAge: 0
    });

    const refreshCookie = serialize('refreshToken', '', {
        ...COOKIE_CONFIG,
        maxAge: 0
    });

    res.header('Set-Cookie', [accessCookie, refreshCookie, tempCookie]);
}

export function getSessionCookies(req) {
    const cookieHeader = req.headers.cookie || '';
    const parsedCookies = parse(cookieHeader);
    return {
        accessToken: parsedCookies.accessToken,
        refreshToken: parsedCookies.refreshToken
    };
}
