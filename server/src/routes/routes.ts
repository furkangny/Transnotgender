import { FastifyInstance } from 'fastify'
import { registerAuthRoutes } from './auth.routes.js'
import { registerWebSocketRoutes } from './websocket.routes.js'
import { registerStaticRoutes } from './static.routes.js'
import { registerErrorRoutes } from './error.routes.js'
import { registerUserRoutes } from './user.routes.js'
import { registerFriendsRoutes } from './friends.routes.js'
import { registerAvatarRoutes } from './avatar.routes.js'

/**
 * Registers all application routes in the correct order.
 * Route registration order:
 * 1. Static routes - Serve HTML, CSS, JS files
 * 2. Error handler - Global error handling
 * 3. Authentication - Login, register, logout endpoints
 * 4. User management - Profile and settings endpoints
 * 5. Avatar management - Profile picture endpoints
 * 6. Friends - Social features endpoints
 * 7. WebSocket - Real-time communication
 * @param server - Fastify instance to register routes on
 */
export async function registerRoutes(server: FastifyInstance)
{
	// Static file serving and SPA fallback handler
	await registerStaticRoutes(server)

	// Global error handler for consistent error responses
	await registerErrorRoutes(server);

	// Authentication endpoints (login, register, logout, OAuth)
	await registerAuthRoutes(server)

	// User profile and settings management
	await registerUserRoutes(server);

	// Avatar upload and management
	await registerAvatarRoutes(server);

	// Friends list and friend requests
	await registerFriendsRoutes(server);

	// WebSocket for real-time game and matchmaking
	await registerWebSocketRoutes(server)
}