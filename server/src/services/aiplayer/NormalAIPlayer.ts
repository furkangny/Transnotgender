import { AIPlayer } from './AIPlayer.js'
import { Player } from '@app/shared/models/Player.js'
import { Ball } from '@app/shared/models/Ball.js'
import { CloneBall } from '@app/shared/models/CloneBall.js'
import { PowerUpFruit } from '@app/shared/types.js'

/**
 * @brief Normal AI using direct ball velocities from game state
 */
export class NormalAIPlayer extends AIPlayer
{
	constructor(
		playerId: 'player1' | 'player2',
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
		super(playerId, gameService, inputState)
	}

	protected refreshAndDecide(): void
	{
		const gameState = this.gameService.getGameState()
		const ball = gameState.ball
		if (!ball)
			return
		this.usePowerUps(gameState)
		
		const isIncoming = this.intelligence.isThreatIncoming(ball.velocityX, this.playerId === 'player1');

		if (!isIncoming) {
			this.goToMiddle();
			return;
		}

		const playerIndex = this.playerId === 'player1' ? 0 : 1
		// Note: Assuming players array order matches player1/player2 logic or filtering correctly
		const myPlayer = gameState.players[playerIndex];
		
		if (!myPlayer || myPlayer.isEliminated()) {
			this.goToMiddle();
			return;
		}

		this.targetY = this.intelligence.computeDefenseTarget(ball, myPlayer);
		this.logger.logStrategy('Defend', { targetY: this.targetY, ballY: ball.positionY });
	}

	/**
	 * @brief Activate available power-ups through input simulation
	 */
	private usePowerUps(
		gameState: { players: Player[]; ball: Ball; cloneBalls: CloneBall[]; fruits: PowerUpFruit[] }
	): void
	{
		const playerIndex = this.playerId === 'player1' ? 0 : 1
		const aiPlayer = gameState.players[playerIndex]
		if (!aiPlayer)
			return
		
		[0, 1, 2].forEach(slotIndex => {
			const powerUp = aiPlayer.itemSlots[slotIndex]
			if (powerUp && !aiPlayer.selectedSlots[slotIndex]) {
				this.requestSlotActivation(slotIndex, 3)
				this.logger.logStrategy('PowerUp', { slot: slotIndex, type: powerUp })
			}
		});
	}
}
