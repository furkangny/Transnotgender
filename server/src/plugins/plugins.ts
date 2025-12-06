import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import websocket from '@fastify/websocket'
import fastifyMultipart from '@fastify/multipart'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { paths } from '../config/paths.js'
import { getDatabase } from '../db/databaseSingleton.js'

// Extend FastifyRequest to include user property for authentication
declare module 'fastify' {
	export interface FastifyRequest {
		user?: any;
	}
}

/**
 * Registers all server plugins in the correct order.
 * Plugin registration order matters for proper functionality:
 * 1. WebSocket - Real-time communication support
 * 2. Cookie - Session management capability
 * 3. Multipart - File upload handling
 * 4. Static files - Serving assets and avatars
 * @param server - Fastify instance to register plugins on
 */
export async function registerPlugins(server: FastifyInstance)
{
	const db = getDatabase();

	// WebSocket plugin for real-time game and chat communication
	await server.register(websocket);
	console.log('[PLUGIN] WebSocket support enabled')

	// Cookie plugin for session-based authentication
	await server.register(fastifyCookie)
	console.log('[PLUGIN] Cookie support enabled')

	// Multipart plugin for avatar file uploads
	console.log('[PLUGIN] Configuring multipart with limits:', {
		fileSize: 5 * 1024 * 1024,
		files: 1
	});
	await server.register(fastifyMultipart, {
		limits: {
			fileSize: 5 * 1024 * 1024, // 5MB max file size
			files: 1 // Single file per request
		}
	});

	// Static file serving for public assets
	await server.register(fastifyStatic, {
		root: paths.public,
		prefix: '/',
		index: false
	})
	console.log('[PLUGIN] Static files configured for public directory')

	// Static file serving for compiled distribution files
	await server.register(fastifyStatic, {
		root: paths.dist,
		prefix: '/dist/',
		index: false,
		decorateReply: false
	})
	console.log('[PLUGIN] Static files configured for dist directory')

	// Static file serving for user avatars
	console.log('[PLUGIN] Configuring avatar static route:', {
		root: paths.avatars,
		prefix: '/avatars/'
	});
	await server.register(fastifyStatic, {
		root: paths.avatars,
		prefix: '/avatars/',
		decorateReply: false
	})

	/**
	 * Authentication pre-handler hook
	 * Validates session cookie and attaches user to request object
	 * Clears invalid session cookies automatically
	 */
	server.addHook('preHandler', async (req: FastifyRequest, res: FastifyReply ) => {
		const sessionId = req.cookies.session_id;
		if (!sessionId)
			return ;

		const user = db.getUserBySessionId(sessionId);

		if (user)
			req.user = user;
		else
		{
			// Clear invalid session cookie
			res.clearCookie('session_id', {
				path: '/',
				httpOnly: true,
				sameSite: 'lax'
			});
		}
	})

	console.log('[PLUGIN] Authentication hook registered')
}

