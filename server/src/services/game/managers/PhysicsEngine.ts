import { Player } from '@app/shared/models/Player.js';
import { Ball } from '@app/shared/models/Ball.js';
import { Paddle } from "@app/shared/models/Paddle.js";
import { CloneBall } from '@app/shared/models/CloneBall.js';
import { Point2D } from '@app/shared/types.js';
import { GeometryManager } from '../geometry.js';
import { CloneBallManager } from '../cloneBalls.js';
import { PowerUpManager } from '../powerUps.js';
import { ScoreKeeper } from './ScoreKeeper.js';

/**
 * @file PhysicsEngine.ts
 * @brief Handles collision detection and physical interactions.
 */
export class PhysicsEngine {
    
    /**
     * @brief Detects collision between a ball and a rectangular paddle.
     */
    public static detectPaddleImpact(paddle: Paddle, ball: Ball): boolean {
        const ballRight = ball.positionX + ball.size;
        const ballBottom = ball.positionY + ball.size;
        const paddleRight = paddle.positionX + paddle.width;
        const paddleBottom = paddle.positionY + paddle.height;

        return (
            ball.positionX < paddleRight &&
            ballRight > paddle.positionX &&
            ball.positionY < paddleBottom &&
            ballBottom > paddle.positionY
        );
    }

    /**
     * @brief Enforces vertical boundaries for the ball.
     */
    public static enforceVerticalBoundaries(ball: Ball, canvasHeight: number): void {
        const hitTop = ball.positionY <= 0 && ball.velocityY < 0;
        const hitBottom = ball.positionY >= canvasHeight - ball.size && ball.velocityY > 0;

        if (hitTop || hitBottom) {
            ball.bounceVertical();
        }
    }

    /**
     * @brief Detects collision between a ball and a polygon paddle using CCD.
     */
    public static detectPolygonImpact(player: Player, ball: Ball, deltaTime: number = 16): boolean {
        if (player.isEliminated() || !player.paddle.isPolygonMode()) {
            return false;
        }

        const paddle = player.paddle;
        const paddleCenter = paddle.getCenter();
        const paddleAngle = paddle.angle;
        const halfLength = paddle.height / 2;
        const halfWidth = paddle.width / 2;
        const ballRadius = ball.size / 2;
        
        const dt = deltaTime / 1000;
        const ballPosNow: Point2D = {
            x: ball.positionX + ballRadius,
            y: ball.positionY + ballRadius
        };
        const ballPosPrev: Point2D = {
            x: ballPosNow.x - ball.velocityX * dt,
            y: ballPosNow.y - ball.velocityY * dt
        };

        if (this.checkOBBIntersection(ballPosNow, paddleCenter, paddleAngle, halfLength, halfWidth, ballRadius)) {
            return true;
        }

        if (this.checkOBBIntersection(ballPosPrev, paddleCenter, paddleAngle, halfLength, halfWidth, ballRadius)) {
            return true;
        }

        const midPoint = {
            x: (ballPosNow.x + ballPosPrev.x) / 2,
            y: (ballPosNow.y + ballPosPrev.y) / 2
        };
        return this.checkOBBIntersection(midPoint, paddleCenter, paddleAngle, halfLength, halfWidth, ballRadius);
    }

    private static checkOBBIntersection(
        pos: Point2D, 
        center: Point2D, 
        angle: number, 
        halfLength: number, 
        halfWidth: number, 
        radius: number
    ): boolean {
        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const closestX = Math.max(-halfLength, Math.min(halfLength, localX));
        const closestY = Math.max(-halfWidth, Math.min(halfWidth, localY));

        const distX = localX - closestX;
        const distY = localY - closestY;
        
        const threshold = (radius + 2) ** 2;
        return (distX * distX + distY * distY) <= threshold;
    }

    /**
     * @brief Orchestrates collision checks for classic mode.
     */
    public static processClassicCollisions(
        players: Player[],
        ball: Ball,
        cloneBalls: CloneBall[],
        canvasWidth: number,
        canvasHeight: number,
        isCustomMode: boolean
    ): [boolean, number] {
        this.enforceVerticalBoundaries(ball, canvasHeight);
        
        let lastTouchedPlayerIndex = -1;
        
        if (ball.velocityX < 0) {
            const hit = this.resolvePaddleHit(players, 0, ball, cloneBalls, isCustomMode);
            if (hit) lastTouchedPlayerIndex = 0;
        }
        
        if (ball.velocityX > 0) {
            const hit = this.resolvePaddleHit(players, 1, ball, cloneBalls, isCustomMode);
            if (hit) lastTouchedPlayerIndex = 1;
        }

        let gameOver = false;
        if (ball.positionX < 0) {
            gameOver = this.resolveScoring(players, 0, ball, cloneBalls, canvasWidth, canvasHeight, isCustomMode);
        } else if (ball.positionX > canvasWidth) {
            gameOver = this.resolveScoring(players, 1, ball, cloneBalls, canvasWidth, canvasHeight, isCustomMode);
        }

        return [gameOver, lastTouchedPlayerIndex];
    }

    public static resolvePaddleHit(
        players: Player[],
        index: number,
        ball: Ball,
        cloneBalls: CloneBall[],
        isCustomMode: boolean
    ): boolean {
        const player = players[index];
        if (!player) return false;

        if (this.detectPaddleImpact(player.paddle, ball)) {
            ball.bounce(player.paddle);
            
            if (ball.isCurving) ball.removeCurve();
            if (ball.isBoosted) ball.removeSpeedBoost();
            
            if (cloneBalls.length > 0) CloneBallManager.clear(cloneBalls);
            
            if (isCustomMode) {
                PowerUpManager.handlePaddleHit(player, ball, cloneBalls, players);
            }
            return true;
        }
        return false;
    }

    public static resolveScoring(
        players: Player[],
        loserIndex: number,
        ball: Ball,
        cloneBalls: CloneBall[],
        width: number,
        height: number,
        isCustomMode: boolean
    ): boolean {
        const loser = players[loserIndex];
        const winner = players[loserIndex === 0 ? 1 : 0];
        
        if (!loser || !winner) return false;

        if (cloneBalls.length > 0) CloneBallManager.clear(cloneBalls);
        
        return ScoreKeeper.processPoint(loser, winner, ball, width, height, isCustomMode);
    }

    public static checkPolygonBoundary(
        ball: Ball,
        geometry: GeometryManager,
        activePlayerCount: number,
        center: Point2D
    ): number {
        const ballCenter: Point2D = {
			x: ball.positionX + ball.size / 2,
			y: ball.positionY + ball.size / 2
		};
		const ballRadius = ball.size / 2;

		const cornerIndex = geometry.checkCornerCollision(
			ballCenter,
			ballRadius,
			activePlayerCount
		);

		if (cornerIndex >= 0)
		{
			const velocity: Point2D = { x: ball.velocityX, y: ball.velocityY };
			const reflected = geometry.reflectOffCorner(
				velocity,
				activePlayerCount,
				cornerIndex,
				ballCenter
			);
			ball.velocityX = reflected.x;
			ball.velocityY = reflected.y;
			const vertex = geometry.getVertex(activePlayerCount, cornerIndex);
			ball.pushAwayFrom(vertex.x, vertex.y, 5);
			return -1;
		}

		if (geometry.isPointInside(ballCenter, activePlayerCount))
			return -1;

		const closestSide = geometry.getClosestSide(ballCenter, activePlayerCount);
		if (closestSide < 0)
			return -1;

		const distanceOutside = geometry.getDistanceOutside(
			ballCenter,
			activePlayerCount,
			closestSide
		);

		if (distanceOutside < 10)
			return -1;

		return closestSide;
    }

    public static resolvePolygonPaddleHit(
        player: Player,
        ball: Ball,
        geometry: GeometryManager,
        activeSideIndex: number,
        activePlayerCount: number,
        cloneBalls: CloneBall[],
        playerIndex: number = -1,
        deltaTime: number = 16,
        isCustomMode: boolean = false,
        allPlayers?: Player[],
        isMultiBall: boolean = false
    ): boolean {
        if (!this.detectPolygonImpact(player, ball, deltaTime)) return false;

        const paddleCenter = player.paddle.getCenter();
        const normal = geometry.getSideNormal(activePlayerCount, activeSideIndex);

        console.log(`[PHYSICS] Polygon Paddle Hit: ${player.name} (Side ${activeSideIndex})`);

        const paddleAngle = player.paddle.angle;
        ball.bouncePolygon(paddleCenter, paddleAngle, player.paddle.height, normal);

        const isDifferentPlayer = ball.lastTouchedPlayerIndex !== playerIndex || ball.lastTouchedPlayerIndex < 0;
        
        if (isDifferentPlayer && !isMultiBall && cloneBalls.length > 0) {
            CloneBallManager.clear(cloneBalls);
        }
        
        if (isDifferentPlayer) {
            if (ball.isCurving) ball.removeCurve();
            if (ball.isBoosted) ball.removeSpeedBoost();
        }

        if (isCustomMode) {
            PowerUpManager.handlePaddleHit(player, ball, cloneBalls, allPlayers);
        }
        return true;
    }
}
