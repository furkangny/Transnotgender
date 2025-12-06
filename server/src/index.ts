import { createApp } from './app.js'

/**
 * Server entry point
 * Initializes the Fastify application and starts listening for connections
 */
(async () => {
	const server = await createApp();

	try {
		console.log('[SERVER] Starting server on port 8080...')
		// Start server on all network interfaces
		await server.listen({ port: 8080, host: '0.0.0.0' })
		console.log('[SERVER] Application started successfully on port 8080')
	} catch (error) {
		console.error('[SERVER] Fatal error during startup:', error);
		process.exit(1);
	}
})()