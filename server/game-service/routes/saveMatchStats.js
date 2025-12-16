/*
 * Save Match Stats Route
 * Stores game results in database
 */

const INSERT_QUERY = `INSERT OR IGNORE INTO games (
  user_name,
  match_id,
  player_id,
  enemy_id,
  user_id,
  left_player_score,
  right_player_score,
  game_duration,
  game_end_result,
  left_player_ball_hit,
  right_player_ball_hit,
  level,
  matchPlayed,
  matchWon,
  matchLost
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export default async function saveMatchStats(req, res, dbConn) {
    try {
        const matchData = req.body;
        
        // Validate required fields
        if (!matchData.matchId || !matchData.playerId || !matchData.userId) {
            console.error("Missing required fields:", { matchId: matchData.matchId, playerId: matchData.playerId, userId: matchData.userId });
            return res.status(400).send({ error: "Missing required fields" });
        }
        
        const paramValues = [
            matchData.userName,
            matchData.matchId,
            matchData.playerId,
            matchData.enemyId,
            matchData.userId,
            matchData.leftPlayerScore,
            matchData.rightPlayerScore,
            matchData.gameDuration,
            matchData.gameEndResult,
            matchData.leftPlayerBallHit,
            matchData.rightPlayerBallHit,
            matchData.level,
            matchData.matchPlayed,
            matchData.matchWon,
            matchData.matchLost,
        ];
        
        console.log(`Saving match data: matchId=${matchData.matchId}, playerId=${matchData.playerId}, userId=${matchData.userId}, score=${matchData.leftPlayerScore}-${matchData.rightPlayerScore}, result=${matchData.gameEndResult}`);
        
        await new Promise((resolve, reject) => {
            dbConn.run(INSERT_QUERY, paramValues, function (err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        console.log(`Duplicate entry prevented: matchId=${matchData.matchId}, playerId=${matchData.playerId} (${err.message})`);
                        resolve(res.status(200).send({ message: "Match already recorded", duplicate: true }));
                    } else {
                        console.error("Error inserting data:", err.message);
                        reject(res.status(500).send({ error: "Database error" }));
                    }
                } else {
                    console.log(`Match saved successfully: id=${this.lastID}, matchId=${matchData.matchId}, playerId=${matchData.playerId}`);
                    resolve(
                        res.status(200).send({
                            message: "Player data saved successfully",
                            id: this.lastID,
                        })
                    );
                }
            });
        });
    } catch (err) {
        console.log("Error saving player data:", err);
        return res.status(500).send({ error: "Server error" });
    }
}
