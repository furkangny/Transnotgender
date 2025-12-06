import { FastifyInstance } from "fastify";
import { getDatabase } from "../db/databaseSingleton.js";

// Friend request action constants
const ACCEPT_REQUEST = true;
const REJECT_REQUEST = false;

/**
 * Registers all friend-related routes.
 * Handles friend list, friend requests, and friend management.
 * @param server - Fastify instance to register routes on
 */
export async function registerFriendsRoutes(server: FastifyInstance)
{
	const db = getDatabase();

	/**
	 * DELETE /api/friends/:alias
	 * Removes a friend from the authenticated user's friend list
	 */
	server.delete('/api/friends/:alias', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const { alias } = req.params as any;

		if (!alias)
			return res.code(400).send({ message: 'Gönderen takma adı gerekli'});

		db.removeFriend(user.id, alias);
		return res.code(200).send({
			success: true,
			message: `${alias} ile artık arkadaş değilsiniz`
		})
	})

	/**
	 * DELETE /api/friends/request/:alias
	 * Cancels a friend request previously sent by the authenticated user
	 */
	server.delete('/api/friends/request/:alias', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const { alias } = req.params as any;

		if (!alias)
			return res.code(400).send({ message: 'Gönderen takma adı gerekli'});

		db.cancelFriendRequest(user.id, alias);
		return res.code(200).send({
			success: true,
			message: 'Arkadaşlık isteği geri çekildi'
		});
	})

	/**
	 * POST /api/friends/request
	 * Sends a friend request to another user by their alias
	 */
	server.post('/api/friends/request', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Takma ad gerekli' });

		const requestId = db.sendFriendRequest(user.id, alias);
		return res.code(201).send({
			success: true,
			message: `${alias} kullanıcısına istek gönderildi`,
			requestId
		});
	})

	/**
	 * POST /api/friends/accept
	 * Accepts a pending friend request from another user
	 */
	server.post('/api/friends/accept', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Gönderen takma adı gerekli'});

		db.handleFriendRequest(user.id, alias, ACCEPT_REQUEST);
		return res.code(200).send({
			success: true,
			message: `${alias} ile artık arkadaşsınız`
		});
	})

	/**
	 * POST /api/friends/reject
	 * Rejects a pending friend request from another user
	 */
	server.post('/api/friends/reject', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Gönderen takma adı gerekli'});

		db.handleFriendRequest(user.id, alias, REJECT_REQUEST);
		return res.code(200).send({
			success: true,
			message: 'Arkadaşlık isteği reddedildi'
		});
	})

	/**
	 * GET /api/friends
	 * Returns the list of friends for the authenticated user
	 */
	server.get('/api/friends', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const friends = db.getFriends(user.id);
		return res.code(200).send({ friends });
	})

	/**
	 * GET /api/friends/requests/pending
	 * Returns pending friend requests received by the authenticated user
	 */
	server.get('/api/friends/requests/pending', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const pendingRequests = db.getPendingFriendRequests(user.id);
		return res.code(200).send({ pendingRequests });
	})

	/**
	 * GET /api/friends/requests/sent
	 * Returns friend requests sent by the authenticated user
	 */
	server.get('/api/friends/requests/sent', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const sentRequests = db.getSentFriendRequests(user.id);
		return res.code(200).send({ sentRequests });
	})

	/**
	 * GET /api/friends/status/:alias
	 * Returns the friendship status between authenticated user and target user
	 */
	server.get('/api/friends/status/:alias', async (req, res) => {
		const user = (req as any).user
		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' })

		const { alias } = req.params as any
		if (!alias)
			return res.code(400).send({ message: 'Takma ad gerekli' })

		const status = db.getFriendshipStatus(user.id, alias)
		return res.code(200).send({ status })
	})

}