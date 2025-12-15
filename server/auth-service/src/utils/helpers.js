/*
 * Helper Utilities - Auth Service
 * Common utility functions
 */
import { locateAccountByUsername } from "../models/accountRepository.js";

// Password validation regex pattern
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*\W)[A-Za-z\d\W]{8,15}$/;

export function createResponse(httpStatus, msgCode, payload) {
    return {
        statusCode: httpStatus,
        code: msgCode,
        data: payload
    };
}

export function validatePassword(pwd) {
    return PASSWORD_PATTERN.test(pwd);
}

export async function generateUsername(dbConn, baseName) {
    let cleanName = baseName.toLowerCase().replace('/[^a-z0-9]/g', '');
    if (cleanName.length < 3) {
        cleanName = 'user' + cleanName;
    }

    let candidateName = cleanName;
    let suffix = 0;
    
    while (await locateAccountByUsername(dbConn, candidateName)) {
        suffix++;
        candidateName = `${cleanName}${suffix}`;
    }
    
    return candidateName;
}
