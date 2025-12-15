/*
 * Member Repository - Profile Database Operations
 * CRUD operations for user profiles
 */

// SQL Queries
const QUERIES = {
    FIND_BY_ID: 'SELECT * FROM profile WHERE userId = ?',
    FIND_MEMBER: 'SELECT * FROM profile WHERE userId = ? OR username = ? OR email = ?',
    INSERT_WITH_AVATAR: `INSERT INTO profile (userId, username, email, avatar_url, rank) VALUES (?, ?, ?, ?, 
        (SELECT COUNT(*) + 1 FROM profile WHERE profile.userId < ?))`,
    INSERT_WITH_GENDER: `INSERT INTO profile (userId, username, email, gender, rank) VALUES (?, ?, ?, ?, 
        (SELECT COUNT(*) + 1 FROM profile WHERE profile.userId < ?))`,
    CHECK_USERNAME: 'SELECT * FROM profile WHERE username = ?',
    CHECK_EMAIL: 'SELECT * FROM profile WHERE email = ?',
    UPDATE_AVATAR: `UPDATE profile SET avatar_url = ?, updated_at = DATETIME('now') WHERE userId = ?`,
    UPDATE_EMAIL: `UPDATE profile SET email = ?, updated_at = DATETIME('now') WHERE userId = ?`,
    DELETE_MEMBER: 'DELETE FROM profile WHERE userId = ?',
    FIND_ALL: 'SELECT * FROM profile',
    UPDATE_RANK: 'UPDATE profile SET rank = ? WHERE userId = ?'
};

export async function locateMemberById(dbConn, memberId) {
    console.log("fetching member by id...");
    return await dbConn.get(QUERIES.FIND_BY_ID, [memberId]);
}

export async function searchMember(dbConn, memberId, username, email) {
    console.log("fetching member...");
    return await dbConn.get(QUERIES.FIND_MEMBER, [memberId, username, email]);
}

export async function insertMember(dbConn, memberId, username, email, avatarUrl, gender) {
    let result;
    if (avatarUrl) {
        result = await dbConn.run(QUERIES.INSERT_WITH_AVATAR, [memberId, username, email, avatarUrl, memberId]);
    } else {
        result = await dbConn.run(QUERIES.INSERT_WITH_GENDER, [memberId, username, email, gender, memberId]);
    }

    console.log("Member inserted with ID:", result.lastID);
    return result.lastID;
}

export async function checkUsernameExists(dbConn, username) {
    console.log("Checking for duplicate username...");
    return await dbConn.get(QUERIES.CHECK_USERNAME, [username]);
}

export async function checkEmailExists(dbConn, email) {
    console.log("Checking for duplicate email...");
    return await dbConn.get(QUERIES.CHECK_EMAIL, [email]);
}

export async function modifyMemberById(dbConn, memberId, updatedFields) {
    const setStatements = [];
    const values = [];

    for (const field in updatedFields) {
        setStatements.push(`${field} = ?`);
        values.push(updatedFields[field]);
    }

    const sql = `UPDATE profile SET ${setStatements.join(", ")}, updated_at = DATETIME('now') WHERE userId = ?`;
    values.push(memberId);

    const result = await dbConn.run(sql, values);

    return result.changes;
}

export async function modifyMemberPhotoById(dbConn, memberId, avatarUrl) {
    await dbConn.run(QUERIES.UPDATE_AVATAR, [avatarUrl, memberId]);
}

export async function modifyMemberEmailById(dbConn, memberId, email) {
    await dbConn.run(QUERIES.UPDATE_EMAIL, [email, memberId]);
}

export async function removeMember(dbConn, memberId) {
    await dbConn.run(QUERIES.DELETE_MEMBER, [memberId]);
}

export async function retrieveAllMembers(dbConn) {
    return await dbConn.all(QUERIES.FIND_ALL);
}

export async function modifyRankById(dbConn, memberId, rank) {
    await dbConn.run(QUERIES.UPDATE_RANK, [rank, memberId]);
}
