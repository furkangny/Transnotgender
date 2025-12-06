import { Ball } from '@app/shared/models/Ball.js'
import { Player } from '@app/shared/models/Player.js'
import { Point2D } from '@app/shared/types.js'
import { BotIntelligence } from './BotIntelligence.js'

/**
 * @file PolygonIntelligence.ts
 * @brief Specialized AI logic for Polygon (Battle Royale) mode.
 */
export class PolygonIntelligence extends BotIntelligence {

    /**
     * @brief Identifies the most dangerous ball for the player.
     */
    public identifyPrimaryThreat(
        balls: Ball[],
        player: Player,
        sideStart: Point2D,
        sideEnd: Point2D
    ): Ball | null {
        if (balls.length === 0) return null;

        // Use reduce to find the best candidate
        return balls.reduce<{ ball: Ball | null, time: number }>((best, currentBall) => {
            if (!this.isApproaching(currentBall, player)) return best;

            const time = this.computeImpactTime(currentBall, sideStart, sideEnd);
            
            if (time !== null && time >= 0 && time < best.time) {
                if (this.verifyImpact(currentBall, sideStart, sideEnd)) {
                    return { ball: currentBall, time: time };
                }
            }
            return best;
        }, { ball: null, time: Infinity }).ball;
    }

    /**
     * @brief Calculates the intersection point on the player's segment.
     */
    public calculateSegmentIntercept(ball: Ball, sideStart: Point2D, sideEnd: Point2D): number {
        const dx = sideEnd.x - sideStart.x;
        const dy = sideEnd.y - sideStart.y;
        const denom = ball.velocityX * dy - ball.velocityY * dx;

        if (Math.abs(denom) < 0.001) return 0.5;

        const t = ((sideStart.x - ball.positionX) * dy - (sideStart.y - ball.positionY) * dx) / denom;
        
        if (t < 0) return 0.5;

        const intersectX = ball.positionX + ball.velocityX * t;
        const intersectY = ball.positionY + ball.velocityY * t;
        
        const sideLength = Math.sqrt(dx * dx + dy * dy);
        if (sideLength === 0) return 0.5;

        const projLength = ((intersectX - sideStart.x) * dx + (intersectY - sideStart.y) * dy) / sideLength;
        const normalizedPos = projLength / sideLength;

        return Math.max(0.1, Math.min(0.9, normalizedPos));
    }

    /**
     * @brief Finds the nearest ball when no direct threat exists.
     */
    public locateNearestThreat(balls: Ball[], player: Player, sideStart: Point2D, sideEnd: Point2D): number {
        if (balls.length === 0) return 0.5;

        const sideMidX = (sideStart.x + sideEnd.x) / 2;
        const sideMidY = (sideStart.y + sideEnd.y) / 2;

        // Find nearest ball using reduce
        const nearestBall = balls.reduce((nearest, ball) => {
            const dist = Math.hypot(ball.positionX - sideMidX, ball.positionY - sideMidY);
            const nearestDist = Math.hypot(nearest.positionX - sideMidX, nearest.positionY - sideMidY);
            return dist < nearestDist ? ball : nearest;
        });

        return this.trackBall(nearestBall, player);
    }

    private isApproaching(ball: Ball, player: Player): boolean {
        const sideNormalAngle = player.paddle.angle + Math.PI / 2;
        const velDotNormal = ball.velocityX * Math.cos(sideNormalAngle) + ball.velocityY * Math.sin(sideNormalAngle);
        return velDotNormal > 0.1;
    }

    private computeImpactTime(ball: Ball, sideStart: Point2D, sideEnd: Point2D): number | null {
        const dx = sideEnd.x - sideStart.x;
        const dy = sideEnd.y - sideStart.y;
        const denom = ball.velocityX * dy - ball.velocityY * dx;
        
        if (Math.abs(denom) < 0.001) return null;
        
        const t = ((sideStart.x - ball.positionX) * dy - (sideStart.y - ball.positionY) * dx) / denom;
        return t < 0 ? null : t;
    }

    private verifyImpact(ball: Ball, sideStart: Point2D, sideEnd: Point2D): boolean {
        const t = this.computeImpactTime(ball, sideStart, sideEnd);
        if (t === null) return false;

        const intersectX = ball.positionX + ball.velocityX * t;
        const intersectY = ball.positionY + ball.velocityY * t;
        
        const dx = sideEnd.x - sideStart.x;
        const dy = sideEnd.y - sideStart.y;
        const sideLength = Math.hypot(dx, dy);
        
        if (sideLength === 0) return false;

        const projLength = ((intersectX - sideStart.x) * dx + (intersectY - sideStart.y) * dy) / sideLength;
        const normalizedPos = projLength / sideLength;
        
        return normalizedPos >= -0.1 && normalizedPos <= 1.1;
    }

    private trackBall(ball: Ball, player: Player): number {
        const sideStart = player.paddle.getSideStart();
        const sideEnd = player.paddle.getSideEnd();
        if (!sideStart || !sideEnd) return 0.5;

        const sideAngle = player.paddle.angle;
        const sideMidX = (sideStart.x + sideEnd.x) / 2;
        const sideMidY = (sideStart.y + sideEnd.y) / 2;
        
        const ballOffset = (ball.positionX - sideMidX) * Math.cos(sideAngle) + 
                           (ball.positionY - sideMidY) * Math.sin(sideAngle);
        
        const sideLength = Math.hypot(sideEnd.x - sideStart.x, sideEnd.y - sideStart.y);
        
        const normalizedPos = 0.5 + (ballOffset / sideLength);
        return Math.max(0.15, Math.min(0.85, normalizedPos));
    }
}
