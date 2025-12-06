import { canvasHeight, canvasWidth, paddleOffset } from '@app/shared/consts.js';
import { Ball } from '@app/shared/models/Ball.js';
import { Player } from '@app/shared/models/Player.js';

/**
 * @file BotIntelligence.ts
 * @brief Core logic for AI trajectory calculation and decision making.
 */
export class BotIntelligence {
    
    /**
     * @brief Calculates the future Y position of the ball at a specific X coordinate.
     * Uses a mathematical reflection model instead of iterative simulation.
     * 
     * @param startX Starting X position
     * @param startY Starting Y position
     * @param velX Velocity X
     * @param velY Velocity Y
     * @param targetX Target X position to intercept
     * @returns The predicted Y position within canvas bounds
     */
    public predictImpactY(startX: number, startY: number, velX: number, velY: number, targetX: number): number {
        if (velX === 0) return startY;

        const timeToIntercept = (targetX - startX) / velX;
        
        // If moving away, return current Y (no interception in this direction)
        if (timeToIntercept < 0) return startY;

        const totalDisplacementY = velY * timeToIntercept;
        const projectedY = startY + totalDisplacementY;

        // Mathematical reflection (Triangle Wave logic)
        // Period is 2 * canvasHeight
        const doubleHeight = 2 * canvasHeight;
        
        // Normalize to positive range
        let modY = projectedY % doubleHeight;
        if (modY < 0) modY += doubleHeight;

        // Fold the value into [0, canvasHeight]
        // If it's in the second half of the period (canvasHeight to 2*canvasHeight), it reflects back.
        return modY > canvasHeight ? doubleHeight - modY : modY;
    }

    /**
     * @brief Determines if the ball is moving towards the AI player.
     * 
     * @param ballVelocityX X component of ball velocity
     * @param isPlayer1 True if AI is Player 1 (left side), False otherwise
     * @returns boolean
     */
    public isThreatIncoming(ballVelocityX: number, isPlayer1: boolean): boolean {
        // Player 1 is on the left, needs ball moving left (negative velocity)
        // Player 2 is on the right, needs ball moving right (positive velocity)
        return isPlayer1 ? ballVelocityX < 0 : ballVelocityX > 0;
    }

    /**
     * @brief Calculates the ideal paddle position based on ball prediction.
     * 
     * @param ball Current ball object
     * @param player The AI player
     * @returns The target Y position for the paddle center
     */
    public computeDefenseTarget(ball: Ball, player: Player): number {
        const paddleX = player.paddle.positionX + (player.paddle.width / 2);
        
        return this.predictImpactY(
            ball.positionX,
            ball.positionY,
            ball.velocityX,
            ball.velocityY,
            paddleX
        );
    }

    /**
     * @brief Simple heuristic for "Easy" difficulty.
     * Uses previous frame data to simulate reaction delay.
     */
    public computeSimplePrediction(oldX: number, oldY: number, newX: number, newY: number): number {
        const vx = newX - oldX;
        const vy = newY - oldY;
        // Target slightly in front of the paddle line
        const interceptX = canvasWidth - paddleOffset - 10; 
        
        return this.predictImpactY(oldX, oldY, vx, vy, interceptX);
    }
}
