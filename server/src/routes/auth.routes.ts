import { FastifyInstance } from "fastify"
import { getDatabase } from '../db/databaseSingleton.js'
import { hashPassword, verifyPassword } from "../utils/passwords.js"
import { checkForDuplicatesAtRegistering, validateRegistering } from "../validators/auth.validator.js";
import { validateLoggingIn } from "../validators/auth.validator.js";
import { validateGoogleToken } from "../validators/auth.validator.js";

// Session cookie configuration constants
const SESSION_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 // 24 hours
};

/**
 * Registers all authentication-related routes.
 * Handles user registration, login, logout, session management, and OAuth.
 * @param server - Fastify instance to register routes on
 */
export async function registerAuthRoutes(server: FastifyInstance) {
	const db = getDatabase();

	/**
	 * GET /api/auth/me
	 * Returns current authenticated user information
	 */
	server.get('/api/auth/me', async (req, res) => {

		const user = (req as any).user;

		console.log('[AUTH] Session check for user:', user?.alias || 'anonymous');
		if (!user)
			return res.code(401).send({ alias: undefined });
		else
			return res.code(200).send({ alias: user.alias });
	})

	/**
	 * POST /api/auth/logout
	 * Terminates user session and clears authentication cookie
	 */
	server.post('/api/auth/logout', async (req, res) => {
		const user = (req as any).user;

		if (user && user.id)
		{
			db.setUserOnlineStatus(user.id, false);
			db.deleteSession(user.id);
		}

		// Clear session cookie
		res.clearCookie('session_id', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax'
		});

		return res.code(204).send();

	})

	/**
	 * POST /api/auth/google
	 * Handles Google OAuth authentication
	 * Creates new user if first time login, otherwise authenticates existing user
	 */
	server.post('/api/auth/google', async (req, res) => {
		const { credential } = req.body as { credential?: string };

		// Validate Google OAuth token
		const data = await validateGoogleToken(credential);

		let user = db.getUserByLogin(data.email)

		if (!user)
		{
			// First time Google login - create new user
			console.log('[AUTH] Creating new user from Google OAuth...');

			const uniqueAlias = db.generateUniqueAlias(data.name);

			// Generate random password for OAuth users (not used for login)
			const randomPassword = Math.random().toString(36).slice(-16);
			const hashedPassword = hashPassword(randomPassword);

			const userId = db.createUser(data.email, hashedPassword, uniqueAlias);
			user = db.getUserById(userId);

			console.log('[AUTH] New user created:', user?.alias);
		}
		else
			console.log('[AUTH] Existing user authenticated:', user.alias);

		const sessionId = db.createOrUpdateSession(user!.id);

		res.setCookie('session_id', sessionId, SESSION_COOKIE_OPTIONS);

		db.setUserOnlineStatus(user!.id, true);

		return res.code(200).send({
			success: true,
			id: user!.id,
			email: data.email,
			alias: user!.alias,
			picture: data.picture || null,
			message: 'Google ile giriş başarılı'
		});
	})

	/**
	 * POST /api/auth/login
	 * Authenticates user with login credentials and creates session
	 */
	server.post('/api/auth/login', async (req, res) => {

		validateLoggingIn(req.body);
		const { login, password } = req.body as any;
		const user = db.getUserByLogin(login);

		// Create or update session for the authenticated user
		const sessionId = db.createOrUpdateSession(user!.id);

		res.setCookie('session_id', sessionId, SESSION_COOKIE_OPTIONS)

		db.setUserOnlineStatus(user!.id, true);

		return res.code(200).send({
			success: true,
			message: 'Giriş başarılı',
			alias: user!.alias
		})
	})

	/**
	 * POST /api/auth/register
	 * Creates a new user account with login credentials
	 */
	server.post('/api/auth/register', async (req, res) => {

		validateRegistering(req.body);
		const { login, password, passwordValidation, alias } = req.body as any;

		checkForDuplicatesAtRegistering(login, alias);

		// Hash password before storing
		const hashedPassword = hashPassword(password);
		const userId = db.createUser(login, hashedPassword, alias);

		// Create session for automatic login after registration
		const sessionId = db.createOrUpdateSession(userId);

		res.setCookie('session_id', sessionId, SESSION_COOKIE_OPTIONS);

		db.setUserOnlineStatus(userId, true);

		return res.code(201).send({
			success: true,
			message: 'Kullanıcı başarıyla oluşturuldu'
		});
	})
}
