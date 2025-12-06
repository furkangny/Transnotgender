import { NormalAIPlayer } from './NormalAIPlayer.js'
import { Ball } from '@app/shared/models/Ball.js'
import { Player } from '@app/shared/models/Player.js'
import { PolygonIntelligence } from './core/PolygonIntelligence.js'

/**
 * @brief Battle Royale AI player extending NormalAIPlayer
 * 
 * Adapts NormalAIPlayer for polygon mode by calculating ball trajectory
 * intersection with the player's side segment.
 */
export class BRNormalAIPlayer extends NormalAIPlayer
{
	private brPlayerIndex: number
	private targetSidePosition: number | null
	private isInClassicMode: boolean
	private polygonIntelligence: PolygonIntelligence

	constructor(
		playerIndex: number,
		gameService: import('../game/game.js').GameService,
		inputState: {
			up: boolean
			down: boolean
			slot1?: boolean
			slot2?: boolean
			slot3?: boolean
		}
	)
	{
		super('player2', gameService, inputState)
		this.brPlayerIndex = playerIndex
		this.targetSidePosition = null
		this.isInClassicMode = false
		this.polygonIntelligence = new PolygonIntelligence()
	}

	/**
	 * @brief Override move for polygon paddle movement
	 */
	protected override move(): void
	{
		if (this.isInClassicMode)
		{
			super.move()
			return
		}

		this.inputState.slot1 = false
		this.inputState.slot2 = false
		this.inputState.slot3 = false
		this.processSlotHold(0)
		this.processSlotHold(1)
		this.processSlotHold(2)

		const gameState = this.gameService.getGameState()
		const player = gameState.players[this.brPlayerIndex]
		if (!player || player.isEliminated())
		{
			this.stopMovement()
			return
		}

		if (!player.paddle.isPolygonMode())
		{
			this.isInClassicMode = true
			super.move()
			return
		}

		const paddle = player.paddle
		const currentPos = paddle.sidePosition
		const tolerance = 0.03

		if (this.targetSidePosition === null)
			this.targetSidePosition = 0.5

		const distance = currentPos - this.targetSidePosition
		if (Math.abs(distance) < tolerance)
		{
			this.stopMovement()
			return
		}
		this.inputState.up = distance > 0
		this.inputState.down = distance < 0
	}

	/**
	 * @brief Override refreshAndDecide for polygon mode with multi-ball support
	 */
	protected override refreshAndDecide(): void
	{
		const gameState = this.gameService.getGameState()
		const player = gameState.players[this.brPlayerIndex]

		if (!player || player.isEliminated())
		{
			this.targetSidePosition = 0.5
			return
		}

		if (!player.paddle.isPolygonMode() || this.isInClassicMode)
		{
			this.isInClassicMode = true
			this.handleClassicModeDecision(gameState)
			return
		}

		this.useBRPowerUps(player)
		const sideStart = player.paddle.getSideStart()
		const sideEnd = player.paddle.getSideEnd()

		if (!sideStart || !sideEnd)
		{
			this.targetSidePosition = 0.5
			return
		}

		const allBalls: Ball[] = []
		if (gameState.balls && gameState.balls.length > 0)
			allBalls.push(...gameState.balls)
		else if (gameState.ball)
			allBalls.push(gameState.ball)

		const threatBall = this.polygonIntelligence.identifyPrimaryThreat(allBalls, player, sideStart, sideEnd)
		
		if (threatBall) {
			this.targetSidePosition = this.polygonIntelligence.calculateSegmentIntercept(threatBall, sideStart, sideEnd)
			this.logger.logStrategy('PolygonDefend', { threat: true })
		} else {
			this.targetSidePosition = this.polygonIntelligence.locateNearestThreat(allBalls, player, sideStart, sideEnd)
			this.logger.logStrategy('PolygonIdle', { threat: false })
		}
	}

	/**
	 * @brief Handle decision making when switched to classic 2-player mode
	 */
	private handleClassicModeDecision(
		gameState: ReturnType<import('../game/game.js').GameService['getGameState']>
	): void
	{
		const activePlayers = gameState.players.filter(p => !p.isEliminated())
		if (activePlayers.length !== 2)
			return

		const myPlayerArrayIndex = activePlayers.findIndex(
			(_, idx) => gameState.players.indexOf(activePlayers[idx]!) === this.brPlayerIndex
		)
		if (myPlayerArrayIndex < 0)
			return

		const isOnLeft = activePlayers[myPlayerArrayIndex]!.paddle.positionX < 400
		const ball = gameState.ball
		if (!ball)
		{
			this.targetY = 300
			return
		}

		const isIncoming = this.intelligence.isThreatIncoming(ball.velocityX, isOnLeft);

		if (!isIncoming) {
			this.targetY = 300;
			return;
		}

		const myPlayer = activePlayers[myPlayerArrayIndex]!;
		this.targetY = this.intelligence.computeDefenseTarget(ball, myPlayer);
	}

	/**
	 * @brief Override start for faster refresh rate in BR mode
	 */
	public override start(): void
	{
		this.intervalId = setInterval(() => this.refreshAndDecide(), 200)
		this.movementIntervalId = setInterval(() => this.move(), 1000 / 60)
	}

	/**
	 * @brief Activate available power-ups for Battle Royale player
	 * @param player Player object
	 */
	private useBRPowerUps(player: Player): void
	{
		if (!player.itemSlots)
			return
		
		[0, 1, 2].forEach(slotIndex => {
			const powerUp = player.itemSlots[slotIndex]
			if (powerUp && !player.selectedSlots[slotIndex]) {
				this.requestSlotActivation(slotIndex, 3)
			}
		});
	}
}
