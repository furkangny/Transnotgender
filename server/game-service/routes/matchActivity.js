/*
 * Match Activity Route
 * WebSocket endpoint for recent game activity
 */

const activeClients = [];
let lastProcessedGameId = 0;

async function pollForNewMatches(dbConn) {
    try {
        const countResult = await dbConn.get(`SELECT COUNT(*) as total FROM games`);

        const latestRow = await dbConn.get(`SELECT match_id FROM games ORDER BY id DESC LIMIT 1`);

        if (!latestRow) {
            return;
        }

        const latestMatchId = latestRow.match_id;

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

        const maxGameId = gameRecords[0].id;
        if (maxGameId <= lastProcessedGameId) {
            return;
        }

        lastProcessedGameId = maxGameId;

        const formattedPayload = gameRecords.map((record) => ({
            enemyId: record.enemy_id,
            userId: record.user_id,
            leftPlayerScore: record.left_player_score,
            rightPlayerScore: record.right_player_score,
            playerId: record.player_id,
            gameEndResult: record.game_end_result,
        }));

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

export default function matchActivity(wsConnection, req, dbConn) {
    activeClients.push(wsConnection);

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
