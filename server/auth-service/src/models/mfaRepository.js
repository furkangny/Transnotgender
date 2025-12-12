export async function storeTempSecret(db, secret, qrCodeUrl, id) {
    const result = await db.run('INSERT into twofa (type, temp_secret, qrcode_url, user_id) VALUES (?, ?, ?, ?)',
        ['app', secret, qrCodeUrl, id]
    );

    console.log("Mfa: inserted tempSecret in row: ", result.lastID);
    return result.lastID;
}

export async function modifyTempSecret(db, secret, id) {
    const result = await db.run('UPDATE twofa SET temp_secret = ? WHERE user_id = ? AND type = ?',
        [secret, id, 'app']
    );

    console.log("Mfa: modified tempSecret in row: ", result.changes);
    return result.changes;
}

export async function modifyAccountSecret(db, id) {
    const result = await db.run(`UPDATE twofa SET
        secret = temp_secret,
        temp_secret = NULL,
        enabled = TRUE
        WHERE user_id = ? AND type = ?`,
        [id, 'app']
    );
    console.log("Mfa(app) modified with ID: ", result.changes);
    return result.changes;
}

export async function storeOtpCode(db, otpCode, id) {
    const result = await db.run(`INSERT into twofa (type, otp, otp_exp, user_id) VALUES (?, ?, ?, ?)`,
        ['email', otpCode, Date.now() + 60 * 5 * 1000, id]
    );
    console.log("Mfa: inserted TOTP code in row: ", result.lastID);
    return result.lastID;
}

export async function modifyOtpCode(db, otpCode, id, type) {
    const result = await db.run(`UPDATE twofa SET 
        otp = ?, 
        otp_exp = ? 
        WHERE user_id = ? AND type = ?`,
        [otpCode, Date.now() + 5 * 60 * 1000, id, type]
    );
    console.log("Mfa: modified TOTP code");
    return result.changes;
}

export async function clearOtpCode(db, id, type) {
    const result = await db.run(`UPDATE twofa SET 
        otp = NULL, 
        otp_exp = ? 
        WHERE user_id = ? AND type = ?`,
        [Date.now(), id, type]
    );
    console.log("Mfa: cleared TOTP code");
    return result.changes;
}

export async function modifyAccountMfa(db, id, type) {
    const result = await db.run(`UPDATE twofa SET
        enabled = TRUE,
        is_verified = TRUE
        WHERE user_id = ? AND type = ?`,
        [id, type]
    );
    console.log(`Mfa(${type}) modified with ID: `, result.changes);
    return result.changes;
}

export async function locateMfaByAccountIdAndType(db, id, type) {
    console.log('Fetching mfa by ID and type...');
    return await db.get('SELECT * FROM twofa WHERE user_id = ? AND type = ?',
        [id, type]
    );
}

export async function locateMfaByAccountIdAndNotType(db, id, type) {
    console.log('Fetching mfa by ID and other type...');
    return await db.get('SELECT * FROM twofa WHERE user_id = ? AND type != ?',
        [id, type]
    );
}

export async function locateMfaByAccountId(db, id) {
    console.log('Fetching mfa by ID');
    return await db.get('SELECT * FROM twofa WHERE id = ?',
        [id]
    );
}

export async function locatePrimaryMfaByAccountId(db, id) {
    console.log('Fetching primary Mfa by ID');
    return await db.get('SELECT * FROM twofa WHERE user_id = ? AND is_primary = TRUE',
        [id]
    );
}

export async function fetchVerifiedMfaMethodsByAccountId(db, id) {
    console.log('Fetching all verified mfa methods by accountId');
    return await db.all('SELECT enabled, is_primary, type FROM twofa WHERE user_id = ? AND is_verified = TRUE',
        [id]
    );
}

export async function disableMfaByAccountIdAndType(db, id, type) {
    console.log('Disabling mfa by accountId and type');
    await db.run('UPDATE twofa SET enabled = FALSE WHERE user_id = ? AND type = ?',
        [id, type]
    );
}

export async function enableMfaByAccountIdAndType(db, id, type) {
    console.log('Enabling mfa by accountId and type');
    return await db.run('UPDATE twofa SET enabled = TRUE WHERE user_id = ? AND type = ?',
        [id, type]
    );
}

export async function makeMfaPrimaryByAccountIdAndType(db, id, type) {
    console.log('Making mfa method primary by accountId and type');
    await db.exec('BEGIN');
    try {
        await db.run('UPDATE twofa SET is_primary = FALSE WHERE user_id = ?', [id]);
        await db.run('UPDATE twofa SET is_primary = TRUE WHERE user_id = ? AND type = ?', [id, type]);
        await db.exec('COMMIT');
    } catch (error) {
        await db.exec('ROLLBACK');
        throw new Error(error);
    }
}
