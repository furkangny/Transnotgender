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
        await new Promise((resolve, reject) => {
            dbConn.run(INSERT_QUERY, paramValues, function (err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        console.log("Unique constraint violated:", err.message);
                    } else {
                        console.error("Error inserting data:", err.message);
                        reject(res.status(500).send({ error: "Database error" }));
                    }
                } else {
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
