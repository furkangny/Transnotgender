import { WebSocket } from 'ws'
import { WebSocketMessage } from '../../../types.js'
import { Player } from './types.js'
import { GameRoomManager } from '../game/gameRoomManager.js'
import { sendMessage } from '../../../utils/websocket.js'
import { QueueManager } from './QueueManager.js'

/**
 * @brief Handles quick 1v1 matchmaking with separate normal/custom queues
 */
export class QuickMatchService
{
	private queueManager: QueueManager
	private gameRoomManager: GameRoomManager

	constructor(gameRoomManager: GameRoomManager)
	{
		this.gameRoomManager = gameRoomManager
		this.queueManager = new QueueManager()
	}

	/**
	 * @brief Add player to quick match queue
	 * @param socket Player's WebSocket
	 * @param playerName Player's name
	 * @param isCustom Join custom mode queue
	 */
	public addToQueue(socket: WebSocket, playerName: string, isCustom: boolean): void
	{
		const mode = isCustom ? 'custom' : 'normal'
		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}
		
		if (this.queueManager.getQueueLength(mode) >= 1)
		{
			const opponent = this.queueManager.dequeue(mode)!
			console.log(`[QUICK_MATCH] Creating ${mode} game: ${opponent.name} vs ${player.name}`)
			const gameId = this.gameRoomManager.createGame(opponent, player, isCustom, 'normal', 5)
			sendMessage(opponent.socket, { type: 'gameStart', playerRole: 'player1', player1Name: opponent.name, player2Name: player.name })
			sendMessage(player.socket, { type: 'gameStart', playerRole: 'player2', player1Name: opponent.name, player2Name: player.name })
		}
		else
		{
			this.queueManager.enqueue(player, mode)
			console.log(`[QUICK_MATCH] ${player.name} waiting for ${mode} game (${this.queueManager.getQueueLength(mode)}/2)`)
			sendMessage(socket, { type: 'waiting' })
			sendMessage(socket, { type: 'playerJoined', playerCount: 1 })
		}
	}

	/**
	 * @brief Create AI game (instant match)
	 * @param socket Player's WebSocket
	 * @param playerName Player's name
	 * @param isCustom Enable custom mode
	 * @param difficulty AI difficulty (0=easy, 1=normal, 2=hard)
	 * @param lifeCount Number of lives for the game
	 */
	public createAIMatch(socket: WebSocket, playerName: string, isCustom: boolean, difficulty: number = 1, lifeCount: number = 5): void
	{
		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}
		const aiName = difficulty === 0 ? 'XavierNiestre' : difficulty === 1 ? 'XavierNiel' : 'XavierMiel';
		const gameId = this.gameRoomManager.createAIGame(player, isCustom, difficulty, 'normal', lifeCount, aiName)
		console.log(`[QUICK_MATCH] AI game created: ${gameId} (custom: ${isCustom}, difficulty: ${difficulty}, lifeCount: ${lifeCount})`)
		sendMessage(player.socket, { type: 'gameStart', playerRole: 'player1', player1Name: player.name, player2Name: aiName })
	}

	/**
	 * @brief Remove player from waiting queues
	 * @param socket Player's WebSocket
	 * @returns True if player was in queue
	 */
	public removeFromQueue(socket: WebSocket): boolean
	{
		return this.queueManager.removePlayer(socket)
	}
}
