/*
 * Account Repository - Database Operations
 * CRUD operations for user accounts
 */

// SQL Queries
const QUERIES = {
    FIND_BY_USERNAME: 'SELECT * FROM user WHERE username = ?',
    FIND_BY_EMAIL: 'SELECT * FROM user WHERE email = ?',
    FIND_BY_ID: 'SELECT * FROM user WHERE id = ?',
    FIND_BY_USERNAME_OR_EMAIL: 'SELECT * FROM user WHERE username = ? OR email = ?',
    FIND_OAUTH: 'SELECT * FROM oauth_identity WHERE provider = ? AND provider_sub = ?',
    INSERT_USER: 'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
    UPDATE_PASSWORD: `UPDATE user SET password = ?, updated_at = DATETIME('now') WHERE id = ?`,
    DELETE_USER: 'DELETE FROM user WHERE id = ?',
    INSERT_USER_BASIC: 'INSERT INTO user (username, email) VALUES (?, ?)',
    INSERT_OAUTH: 'INSERT INTO oauth_identity (user_id, provider, provider_sub, email, access_token, refresh_token) VALUES (?, ?, ?, ?, ?, ?)',
    UPDATE_EMAIL: `UPDATE user SET email = ?, updated_at = DATETIME('now') WHERE id = ?`,
    UPDATE_USERNAME: `UPDATE user SET username = ?, updated_at = DATETIME('now') WHERE id = ?`,
    DELETE_OAUTH: 'DELETE FROM oauth_identity WHERE user_id = ?'
};

export async function locateAccountByUsername(dbConn, username) {
    console.log('fetching account by username...')
    return await dbConn.get(QUERIES.FIND_BY_USERNAME, [username]);
}

export async function locateAccountByEmail(dbConn, email) {
    console.log('fetching account by email...')
    return await dbConn.get(QUERIES.FIND_BY_EMAIL, [email]);
}

export async function locateAccountById(dbConn, accountId) {
    console.log('fetching account by id...')
    return await dbConn.get(QUERIES.FIND_BY_ID, [accountId]);
}

export async function locateAccount(dbConn, username, email) {
    console.log('fetching account...')
    return await dbConn.get(QUERIES.FIND_BY_USERNAME_OR_EMAIL, [username, email]);
}

export async function locateOAuthProvider(dbConn, provider, providerSub) {
    console.log(`fetching OAuth provider...(provider :${provider}, sub: ${providerSub})`)
    return await dbConn.get(QUERIES.FIND_OAUTH, [provider, providerSub]);
}

export async function insertAccount(dbConn, username, email, hashedPassword) {
    const result = await dbConn.run(QUERIES.INSERT_USER, [username, email, hashedPassword]);
    console.log("Account inserted with ID: ", result.lastID);
    return result.lastID;
}

export async function modifyAccount(dbConn, accountId, newPassword) {
    const result = await dbConn.run(QUERIES.UPDATE_PASSWORD, [newPassword, accountId]);
    console.log("Account modified with ID: ", result.changes);
    return result.changes;
}

export async function removeAccount(dbConn, accountId) {
    const result = await dbConn.run(QUERIES.DELETE_USER, [accountId]);
    console.log("Account removed with ID: ", accountId);
    return result.changes;
}

export async function insertAccountWithOAuth(dbConn, oauthUserInfo) {
    const userResult = await dbConn.run(QUERIES.INSERT_USER_BASIC, [
        oauthUserInfo.username,
        oauthUserInfo.email
    ]);
    console.log('Added account with ID: ', userResult.lastID);

    await dbConn.run(QUERIES.INSERT_OAUTH, [
        userResult.lastID,
        oauthUserInfo.provider,
        oauthUserInfo.sub,
        oauthUserInfo.email,
        oauthUserInfo.accessToken,
        oauthUserInfo.refreshToken
    ]);
    console.log("OAuth provider linked with ID: ", userResult.lastID);
    return userResult.lastID;
}

export async function connectOAuthToAccount(dbConn, accountId, oauthInfo) {
    await dbConn.run(QUERIES.INSERT_OAUTH, [
        accountId,
        oauthInfo.provider,
        oauthInfo.sub,
        oauthInfo.email,
        oauthInfo.accessToken,
        oauthInfo.refreshToken
    ]);
    console.log("OAuth provider linked with ID: ", accountId);
    return accountId;
}

export async function modifyAccountEmail(dbConn, newEmail, accountId) {
    const result = await dbConn.run(QUERIES.UPDATE_EMAIL, [newEmail, accountId]);
    console.log('Modified email for accountId: ', accountId);
}

export async function modifyAccountUsername(dbConn, newUsername, accountId) {
    const result = await dbConn.run(QUERIES.UPDATE_USERNAME, [newUsername, accountId]);
    console.log('Modified username for accountId: ', accountId);
}

export async function removeOAuthProvider(dbConn, accountId) {
    await dbConn.run(QUERIES.DELETE_OAUTH, [accountId]);
}
