import { Player } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
import { Point2D } from "@app/shared/types.js";
import { paddleSize } from "@app/shared/consts.js";

/**
 * @file ScoreKeeper.ts
 * @brief Manages game scoring, life deduction, and power-up penalties/bonuses.
 */
export class ScoreKeeper {
    
    /**
     * @brief Processes a scoring event in classic mode.
     * @returns boolean True if the game has ended (loser eliminated).
     */
    public static processPoint(
        loser: Player,
        winner: Player,
        ball: Ball,
        canvasWidth: number,
        canvasHeight: number,
        isCustomMode: boolean
    ): boolean {
        const previousLives = loser.lives;
        loser.loseLife();
        
        this.logScoreEvent(loser, winner, previousLives);

        if (isCustomMode) {
            this.handlePowerUpConsequences(winner, loser);
        }

        this.resetRound(ball, winner, loser, canvasWidth, canvasHeight);

        if (loser.isEliminated()) {
            console.log(`[SERVER] GAME OVER! ${winner.name} wins (${winner.lives} lives remaining)`);
            return true;
        }
        return false;
    }

    /**
     * @brief Processes a scoring event in Battle Royale (Polygon) mode.
     */
    public static processPolygonPoint(
        loser: Player,
        ball: Ball,
        center: Point2D,
        scorer: Player | null = null,
        isCustomMode: boolean = false,
        allPlayers?: Player[]
    ): boolean {
        loser.loseLife();
        
        const ballPos = { x: ball.positionX + ball.size/2, y: ball.positionY + ball.size/2 };
        const paddlePos = loser.paddle.getCenter();
        const dist = Math.hypot(ballPos.x - paddlePos.x, ballPos.y - paddlePos.y);
        
        console.log(`[BR] ${loser.name} lost a life! ${loser.lives} remaining | ball(${ballPos.x.toFixed(0)},${ballPos.y.toFixed(0)}) paddle(${paddlePos.x.toFixed(0)},${paddlePos.y.toFixed(0)}) dist=${dist.toFixed(0)}`);

        if (isCustomMode) {
            this.handlePolygonPowerUps(loser, scorer, allPlayers);
        }

        ball.resetToPoint(center.x, center.y, true);
        return loser.isEliminated();
    }

    private static logScoreEvent(loser: Player, winner: Player, oldLives: number): void {
        console.log(`[SERVER] ${loser.name} LOST A LIFE! ${oldLives} -> ${loser.lives}`);
        console.log(`[SERVER] Lives: ${winner.name} ${winner.lives} - ${loser.lives} ${loser.name}`);
    }

    private static handlePowerUpConsequences(winner: Player, loser: Player): void {
        winner.clearPendingPowerUps();
        loser.clearPendingPowerUps();
        
        if (winner.chargingPowerUp) {
            winner.incrementHitStreak();
            console.log(`[SERVER] ${winner.name} gained 1 charge for scoring (${winner.hitStreak}/3)`);
            
            if (winner.hitStreak >= 3) {
                const powerUp = winner.chargingPowerUp;
                const slotIndex = powerUp === 'Son' ? 0 : powerUp === 'Pi' ? 1 : 2;
                winner.itemSlots[slotIndex] = powerUp;
                winner.chargingPowerUp = null;
                winner.hitStreak = 0;
                console.log(`[SERVER] ${winner.name} completed ${powerUp} from scoring bonus!`);
            }
        }
        
        loser.resetHitStreak();
        const removedPowerUp = loser.removeRandomPowerUp();
        if (removedPowerUp) {
            console.log(`[SERVER] ${loser.name} lost ${removedPowerUp} (lost a life)`);
        } else {
            console.log(`[SERVER] ${loser.name} had no power-ups to lose`);
        }
        console.log(`[SERVER] Pending power-ups cleared for both players`);
    }

    private static handlePolygonPowerUps(loser: Player, scorer: Player | null, allPlayers?: Player[]): void {
        if (allPlayers) {
            allPlayers.forEach(p => {
                if (!p.isEliminated()) p.clearPendingPowerUps();
            });
        }

        if (scorer && scorer !== loser) {
            scorer.awardFullCharge();
            console.log(`[BR] ${scorer.name} gained full charge for scoring!`);
        }

        loser.resetHitStreak();
        const removed = loser.removeRandomPowerUp();
        if (removed) {
            console.log(`[BR] ${loser.name} lost ${removed} (conceded a goal)`);
        }
    }

    private static resetRound(ball: Ball, winner: Player, loser: Player, width: number, height: number): void {
        ball.reset(width, height);
        winner.paddle.positionY = height / 2 - paddleSize / 2;
        loser.paddle.positionY = height / 2 - paddleSize / 2;
    }
}
