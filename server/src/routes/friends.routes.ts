import { FastifyInstance } from "fastify";
import { getDatabase } from "../db/databaseSingleton.js";

const ACCEPT_REQUEST = true;
const REJECT_REQUEST = false;

export async function registerFriendsRoutes(server: FastifyInstance)
{
	const db = getDatabase();

	server.get('/api/friends', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const friends = db.getFriends(user.id);
		return res.code(200).send({ friends });
	})

	server.get('/api/friends/requests/pending', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const pendingRequests = db.getPendingFriendRequests(user.id);
		return res.code(200).send({ pendingRequests });
	})

	server.get('/api/friends/requests/sent', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const sentRequests = db.getSentFriendRequests(user.id);
		return res.code(200).send({ sentRequests });
	})

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

	//*Send request
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

	//*accept a request
	server.post('/api/friends/accept', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Gönderen takma adı gerekli'});

		db.handleFriendRequest(user.id, alias, ACCEPT_REQUEST);
		return res.code(200).send({
			succes: true,
			message: `${alias} ile artık arkadaşsınız`
		});
	})

	//*reject a request
	server.post('/api/friends/reject', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Lütfen tekrar giriş yapın' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Gönderen takma adı gerekli'});

		db.handleFriendRequest(user.id, alias, REJECT_REQUEST);
		return res.code(200).send({
			succes: true,
			message: 'Arkadaşlık isteği reddedildi'
		});
	})

	//*delete a request
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

	//*delete a friend
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

}