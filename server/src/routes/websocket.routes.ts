import { FastifyInstance } from 'fastify'
import { MatchmakingService } from '../services/matchmaking/matchmaking.js'

// Singleton matchmaking service instance for handling all game connections
const matchmaking = new MatchmakingService()

/**
 * Registers WebSocket routes for real-time communication.
 * Handles game matchmaking, lobby management, and live game state updates.
 * @param server - Fastify instance to register routes on
 */
export async function registerWebSocketRoutes(server: FastifyInstance)
{
	/**
	 * WebSocket endpoint for game communication
	 * Handles: matchmaking, game state sync, player inputs
	 */
	server.get('/ws', { websocket: true }, (connection, req) => {
		const ws = connection.socket

		// Handle incoming messages from client
		ws.on('message', (message) =>
		{
			try {
				const data = JSON.parse(message.toString());
				matchmaking.handleMessage(ws, data);
			} catch (error) {
				console.error('[WS] Failed to process message:', error);
			}
		})

		// Clean up when client disconnects
		ws.on('close', () =>
		{
			matchmaking.removePlayer(ws);
		})
	})
}