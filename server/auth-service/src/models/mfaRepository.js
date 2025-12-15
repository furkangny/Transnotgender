/*
 * MFA Repository - Multi-Factor Authentication
 * Handles TOTP and email-based 2FA operations
 */

// Time constants
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// SQL Queries
const QUERIES = {
    INSERT_APP_MFA: 'INSERT into twofa (type, temp_secret, qrcode_url, user_id) VALUES (?, ?, ?, ?)',
    UPDATE_TEMP_SECRET: 'UPDATE twofa SET temp_secret = ? WHERE user_id = ? AND type = ?',
    ACTIVATE_APP_MFA: `UPDATE twofa SET secret = temp_secret, temp_secret = NULL, enabled = TRUE WHERE user_id = ? AND type = ?`,
    INSERT_EMAIL_MFA: 'INSERT into twofa (type, otp, otp_exp, user_id) VALUES (?, ?, ?, ?)',
    UPDATE_OTP: 'UPDATE twofa SET otp = ?, otp_exp = ? WHERE user_id = ? AND type = ?',
    CLEAR_OTP: 'UPDATE twofa SET otp = NULL, otp_exp = ? WHERE user_id = ? AND type = ?',
    ENABLE_MFA: 'UPDATE twofa SET enabled = TRUE, is_verified = TRUE WHERE user_id = ? AND type = ?',
    FIND_BY_USER_TYPE: 'SELECT * FROM twofa WHERE user_id = ? AND type = ?',
    FIND_BY_USER_NOT_TYPE: 'SELECT * FROM twofa WHERE user_id = ? AND type != ?',
    FIND_BY_ID: 'SELECT * FROM twofa WHERE id = ?',
    FIND_PRIMARY: 'SELECT * FROM twofa WHERE user_id = ? AND is_primary = TRUE',
    FIND_VERIFIED: 'SELECT enabled, is_primary, type FROM twofa WHERE user_id = ? AND is_verified = TRUE',
    DISABLE: 'UPDATE twofa SET enabled = FALSE WHERE user_id = ? AND type = ?',
    ENABLE: 'UPDATE twofa SET enabled = TRUE WHERE user_id = ? AND type = ?',
    CLEAR_PRIMARY: 'UPDATE twofa SET is_primary = FALSE WHERE user_id = ?',
    SET_PRIMARY: 'UPDATE twofa SET is_primary = TRUE WHERE user_id = ? AND type = ?'
};

export async function storeTempSecret(dbConn, secret, qrCodeUrl, accountId) {
    const result = await dbConn.run(QUERIES.INSERT_APP_MFA, ['app', secret, qrCodeUrl, accountId]);
    console.log("Mfa: inserted tempSecret in row: ", result.lastID);
    return result.lastID;
}

export async function modifyTempSecret(dbConn, secret, accountId) {
    const result = await dbConn.run(QUERIES.UPDATE_TEMP_SECRET, [secret, accountId, 'app']);
    console.log("Mfa: modified tempSecret in row: ", result.changes);
    return result.changes;
}

export async function modifyAccountSecret(dbConn, accountId) {
    const result = await dbConn.run(QUERIES.ACTIVATE_APP_MFA, [accountId, 'app']);
    console.log("Mfa(app) modified with ID: ", result.changes);
    return result.changes;
}

export async function storeOtpCode(dbConn, otpCode, accountId) {
    const expiryTime = Date.now() + OTP_EXPIRY_MS;
    const result = await dbConn.run(QUERIES.INSERT_EMAIL_MFA, ['email', otpCode, expiryTime, accountId]);
    console.log("Mfa: inserted TOTP code in row: ", result.lastID);
    return result.lastID;
}

export async function modifyOtpCode(dbConn, otpCode, accountId, mfaType) {
    const expiryTime = Date.now() + OTP_EXPIRY_MS;
    const result = await dbConn.run(QUERIES.UPDATE_OTP, [otpCode, expiryTime, accountId, mfaType]);
    console.log("Mfa: modified TOTP code");
    return result.changes;
}

export async function clearOtpCode(dbConn, accountId, mfaType) {
    const result = await dbConn.run(QUERIES.CLEAR_OTP, [Date.now(), accountId, mfaType]);
    console.log("Mfa: cleared TOTP code");
    return result.changes;
}

export async function modifyAccountMfa(dbConn, accountId, mfaType) {
    const result = await dbConn.run(QUERIES.ENABLE_MFA, [accountId, mfaType]);
    console.log(`Mfa(${mfaType}) modified with ID: `, result.changes);
    return result.changes;
}

export async function locateMfaByAccountIdAndType(dbConn, accountId, mfaType) {
    console.log('Fetching mfa by ID and type...');
    return await dbConn.get(QUERIES.FIND_BY_USER_TYPE, [accountId, mfaType]);
}

export async function locateMfaByAccountIdAndNotType(dbConn, accountId, mfaType) {
    console.log('Fetching mfa by ID and other type...');
    return await dbConn.get(QUERIES.FIND_BY_USER_NOT_TYPE, [accountId, mfaType]);
}

export async function locateMfaByAccountId(dbConn, mfaId) {
    console.log('Fetching mfa by ID');
    return await dbConn.get(QUERIES.FIND_BY_ID, [mfaId]);
}

export async function locatePrimaryMfaByAccountId(dbConn, accountId) {
    console.log('Fetching primary Mfa by ID');
    return await dbConn.get(QUERIES.FIND_PRIMARY, [accountId]);
}

export async function fetchVerifiedMfaMethodsByAccountId(dbConn, accountId) {
    console.log('Fetching all verified mfa methods by accountId');
    return await dbConn.all(QUERIES.FIND_VERIFIED, [accountId]);
}

export async function disableMfaByAccountIdAndType(dbConn, accountId, mfaType) {
    console.log('Disabling mfa by accountId and type');
    await dbConn.run(QUERIES.DISABLE, [accountId, mfaType]);
}

export async function enableMfaByAccountIdAndType(dbConn, accountId, mfaType) {
    console.log('Enabling mfa by accountId and type');
    return await dbConn.run(QUERIES.ENABLE, [accountId, mfaType]);
}

export async function makeMfaPrimaryByAccountIdAndType(dbConn, accountId, mfaType) {
    console.log('Making mfa method primary by accountId and type');
    await dbConn.exec('BEGIN');
    try {
        await dbConn.run(QUERIES.CLEAR_PRIMARY, [accountId]);
        await dbConn.run(QUERIES.SET_PRIMARY, [accountId, mfaType]);
        await dbConn.exec('COMMIT');
    } catch (err) {
        await dbConn.exec('ROLLBACK');
        throw new Error(err);
    }
}
