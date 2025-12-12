export async function locateMemberById(db, id) {
    console.log("fetching member by id...");
    return await db.get("SELECT * FROM profile WHERE userId = ?", [id]);
}

export async function searchMember(db, id, username, email) {
    console.log("fetching member...");
    return await db.get(
        "SELECT * FROM profile WHERE userId = ? OR username = ? OR email = ?",
        [id, username, email]
    );
}

export async function insertMember(db, id, username, email, avatar_url, gender) {
    let result;
    if (avatar_url) {
        result = await db.run(
            `INSERT INTO profile (userId, username, email, avatar_url, rank) VALUES (?, ?, ?, ?, 
        (SELECT COUNT(*) + 1 FROM profile WHERE profile.userId < ?))`,
            [id, username, email, avatar_url, id]
        );
    } else {
        result = await db.run(
            `INSERT INTO profile (userId, username, email, gender, rank) VALUES (?, ?, ?, ?, 
        (SELECT COUNT(*) + 1 FROM profile WHERE profile.userId < ?))`,
            [id, username, email, gender, id]
        );
    }

    console.log("Member inserted with ID:", result.lastID);
    return result.lastID;
}

export async function checkUsernameExists(db, username) {
    console.log("Checking for duplicate username...");
    return await db.get("SELECT * FROM profile WHERE username = ?", [username]);
}

export async function checkEmailExists(db, email) {
    console.log("Checking for duplicate email...");
    return await db.get("SELECT * FROM profile WHERE email = ?", [email]);
}

export async function modifyMemberById(db, id, updatedFields) {
    const setStatments = [];
    const values = [];

    for (const field in updatedFields) {
        setStatments.push(`${field} = ?`);
        values.push(updatedFields[field]);
    }

    const sql = `UPDATE profile SET ${setStatments.join(
        ", "
    )}, updated_at = DATETIME('now') WHERE userId = ?`;
    values.push(id);

    const result = await db.run(sql, values);

    return result.changes;
}

export async function modifyMemberPhotoById(db, id, avatar_url) {
    await db.run(
        `UPDATE profile SET avatar_url = ?, updated_at = DATETIME('now') WHERE userId = ?`,
        [avatar_url, id]
    );
}

export async function modifyMemberEmailById(db, id, email) {
    await db.run(
        `UPDATE profile SET email = ?, updated_at = DATETIME('now') WHERE userId = ?`,
        [email, id]
    );
}

export async function removeMember(db, id) {
    await db.run("DELETE FROM profile WHERE userId = ?", [id]);
}

export async function retrieveAllMembers(db) {
    return await db.all("SELECT * FROM profile");
}


export async function modifyRankById(db, userId, rank) {
    await db.run('UPDATE profile SET rank = ? WHERE userId = ?',
        [
            rank,
            userId
        ]
    );
}
