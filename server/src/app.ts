import fastify from 'fastify'
import { registerPlugins } from './plugins/plugins.js'
import { registerRoutes } from './routes/routes.js'
import { paths } from './config/paths.js'

/**
 * Creates and configures the Fastify application instance.
 * This function handles plugin and route registration without network binding.
 * @returns Configured Fastify server instance ready for listening
 */
export async function createApp() {
	const server = fastify({ logger: false });

	try {
		// Register all API and static routes
		await registerRoutes(server);
		console.log('[APP] Route registration completed successfully')

		// Register all server plugins (websocket, cookies, multipart, static files)
		await registerPlugins(server);
		console.log('[APP] Plugin registration completed successfully')
	} catch (error) {
		console.error('[APP] Fatal error during server initialization:', error);
		throw error;
	}

	// Log server path configuration for debugging purposes
	console.log('[APP] Server path configuration:')
	console.log('[APP]   Index file:', paths.index)
	console.log('[APP]   Distribution:', paths.dist)
	console.log('[APP]   Public assets:', paths.public)
	console.log('[APP]   Module directory:', paths.__dirname)
	console.log('[APP]   Working directory:', process.cwd())

	return server;
}