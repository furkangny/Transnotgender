/*
 * Match Activity Route
 * WebSocket endpoint for recent game activity
 */

const activeClients = [];
let lastProcessedGameId = 0;

async function getRecentMatches(dbConn, limit = 20) {
    try {
        const gameRecords = await dbConn.all(
            `SELECT id, enemy_id, user_id, left_player_score, right_player_score, player_id, game_end_result
       FROM games
       ORDER BY id DESC LIMIT ?`,
            [limit * 2]
        );

        if (!gameRecords || gameRecords.length === 0) {
            return [];
        }

        return gameRecords.map((record) => ({
            enemyId: record.enemy_id,
            userId: record.user_id,
            leftPlayerScore: record.left_player_score,
            rightPlayerScore: record.right_player_score,
            playerId: record.player_id,
            gameEndResult: record.game_end_result,
        }));
    } catch (err) {
        console.error("Error fetching recent matches:", err.message);
        return [];
    }
}

async function pollForNewMatches(dbConn) {
    try {
        const latestRow = await dbConn.get(`SELECT match_id, id FROM games ORDER BY id DESC LIMIT 1`);

        if (!latestRow) {
            return;
        }

        const latestMatchId = latestRow.match_id;
        const maxGameId = latestRow.id;

        if (maxGameId <= lastProcessedGameId) {
            return;
        }

        // Check if match is complete (has 2 game records)
        const matchRecordCount = await dbConn.get(
            `SELECT COUNT(*) as count FROM games WHERE match_id = ?`,
            [latestMatchId]
        );

        // Only process if match is complete (2 records, one per player)
        if (!matchRecordCount || matchRecordCount.count < 2) {
            console.log(`Match ${latestMatchId} not complete yet (${matchRecordCount?.count || 0}/2 records). Waiting...`);
            return;
        }

        lastProcessedGameId = maxGameId;

        const gameRecords = await dbConn.all(
            `SELECT id, enemy_id, user_id, left_player_score, right_player_score, player_id, game_end_result
       FROM games
       WHERE match_id = ?
       ORDER BY id DESC LIMIT 2`,
            [latestMatchId]
        );

        if (!gameRecords || gameRecords.length === 0) {
            return;
        }

        // Validate that both records have matching scores
        if (gameRecords.length === 2) {
            const [record1, record2] = gameRecords;
            if (record1.left_player_score !== record2.left_player_score ||
                record1.right_player_score !== record2.right_player_score) {
                console.error(`Score mismatch in match ${latestMatchId}:`, {
                    record1: `${record1.left_player_score}-${record1.right_player_score}`,
                    record2: `${record2.left_player_score}-${record2.right_player_score}`
                });
                return;
            }
        }

        const formattedPayload = gameRecords.map((record) => ({
            enemyId: record.enemy_id,
            userId: record.user_id,
            leftPlayerScore: record.left_player_score,
            rightPlayerScore: record.right_player_score,
            playerId: record.player_id,
            gameEndResult: record.game_end_result,
        }));

        console.log(`Broadcasting match ${latestMatchId} to ${activeClients.length} clients`);

        for (const clientSocket of activeClients) {
            try {
                clientSocket.send(JSON.stringify(formattedPayload));
            } catch (err) {
                console.error("WebSocket send error:", err.message);
            }
        }
    } catch (err) {
        console.error("Polling error:", err.message);
    }
}

export default async function matchActivity(wsConnection, req, dbConn) {
    activeClients.push(wsConnection);

    // Send recent matches on connection
    const recentMatches = await getRecentMatches(dbConn, 20);
    if (recentMatches.length > 0) {
        try {
            wsConnection.send(JSON.stringify(recentMatches));
        } catch (err) {
            console.error("Failed to send initial matches:", err.message);
        }
    }

    wsConnection.on("message", (msg) => {
    });

    wsConnection.on("close", () => {
        const idx = activeClients.indexOf(wsConnection);
        if (idx !== -1) activeClients.splice(idx, 1);
    });

    wsConnection.on("error", (err) => {
        console.error("WebSocket connection error:", err);
    });
}

export { pollForNewMatches };
