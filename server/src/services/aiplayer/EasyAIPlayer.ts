import { AIPlayer } from './AIPlayer.js'
import { canvasHeight, canvasWidth } from '@app/shared/consts.js'

/**
 * @brief Easy AI implementation
 * @description Has a 1 frame delay in reaction time
 */
export class EasyAIPlayer extends AIPlayer
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
		const currentBallX = gameState.ball.positionX
		const currentBallY = gameState.ball.positionY
		
		const deltaX = Math.abs(currentBallX - this.oldBallX)

		if (deltaX > 300)
		{
			this.logger.logStrategy('Reset', { reason: 'Ball teleported' })
			this.oldBallX = canvasWidth / 2
			this.oldBallY = canvasHeight / 2
		}

		const velX = currentBallX - this.oldBallX;
		const isIncoming = this.intelligence.isThreatIncoming(velX, this.playerId === 'player1');

		if (isIncoming)
		{
			this.targetY = this.intelligence.computeSimplePrediction(
				this.oldBallX, 
				this.oldBallY, 
				currentBallX, 
				currentBallY
			)
			this.logger.logStrategy('Defend', { targetY: this.targetY })
		}
		else
		{
			this.goToMiddle()
			this.logger.logStrategy('Idle', { action: 'GoToMiddle' })
		}

		this.oldBallX = currentBallX
		this.oldBallY = currentBallY
	}
}
