
export async function locateAccountByUsername(db, username) {
    console.log('fetching account by username...')
    return await db.get('SELECT * FROM user WHERE username = ?',
        [username]
    );
}

export async function locateAccountByEmail(db, email) {
    console.log('fetching account by email...')
    return await db.get('SELECT * FROM user WHERE email = ?',
        [email]
    );
}

export async function locateAccountById(db, id) {
    console.log('fetching account by id...')
    return await db.get('SELECT * FROM user WHERE id = ?',
        [id]
    );
}

export async function locateAccount(db, username, email) {
    console.log('fetching account...')
    return await db.get('SELECT * FROM user WHERE username = ? OR email = ?',
        [username, email]
    );
}

export async function locateOAuthProvider(db, provider, sub) {
    console.log(`fetching OAuth provider...(provider :${provider}, sub: ${sub})`)
    return await db.get('SELECT * FROM oauth_identity WHERE provider = ? AND provider_sub = ?',
        [provider, sub]);
}

export async function insertAccount(db, username, email, password) {
    const result = await db.run('INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
        [username, email, password]
    );
    console.log("Account inserted with ID: ", result.lastID);
    return result.lastID;
}

export async function modifyAccount(db, id, password) {
    const result = await db.run(`UPDATE user SET password = ?, updated_at = DATETIME('now') WHERE id = ?`, [password, id]);
    console.log("Account modified with ID: ", result.changes);
    return result.changes;
}

export async function removeAccount(db, id) {
    const result = await db.run('DELETE FROM user WHERE id = ?',
        [id]
    );

    console.log("Account removed with ID: ", id);
    return result.changes;
}

export async function insertAccountWithOAuth(db, userInfo) {
    const userResult = await db.run('INSERT INTO user (username, email) VALUES (?, ?)',
        [
            userInfo.username,
            userInfo.email
        ]
    );
    console.log('Added account with ID: ', userResult.lastID);

    await db.run('INSERT INTO oauth_identity (user_id, provider, provider_sub, email, access_token, refresh_token) VALUES (?, ?, ?, ?, ?, ?)',
        [
            userResult.lastID,
            userInfo.provider,
            userInfo.sub,
            userInfo.email,
            userInfo.accessToken,
            userInfo.refreshToken
        ]
    );
    console.log("OAuth provider linked with ID: ", userResult.lastID);
    return userResult.lastID;
}

export async function connectOAuthToAccount(db, id, userInfo) {
    await db.run('INSERT INTO oauth_identity (user_id, provider, provider_sub, email, access_token, refresh_token) VALUES (?, ?, ?, ?, ?, ?)',
        [
            id,
            userInfo.provider,
            userInfo.sub,
            userInfo.email,
            userInfo.accessToken,
            userInfo.refreshToken
        ]
    );
    console.log("OAuth provider linked with ID: ", id);
    return id;
}

export async function modifyAccountEmail(db, email, id) {
    const result = await db.run(`UPDATE user SET email = ?, updated_at = DATETIME('now') WHERE id = ?`,
        [email, id]
    );
    console.log('Modified email for accountId: ', id);
}

export async function modifyAccountUsername(db, username, id) {
    const result = await db.run(`UPDATE user SET username = ?, updated_at = DATETIME('now') WHERE id = ?`,
        [username, id]
    );
    console.log('Modified username for accountId: ', id);
}

export async function removeOAuthProvider(db, id) {
    await db.run('DELETE FROM oauth_identity WHERE user_id = ?',
        [id]
    );
}
