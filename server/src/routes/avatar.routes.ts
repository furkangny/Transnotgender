import { FastifyInstance } from 'fastify'
import { getDatabase } from '../db/databaseSingleton.js'
import path from 'path'
import { paths } from '../config/paths.js'
import fs from 'fs/promises'
import { validateAvatar } from '../validators/avatar.validator.js'
import { DEFAULT_AVATAR_FILENAME } from '../utils/consts.js'

/**
 * Registers all avatar-related routes.
 * Handles avatar upload, retrieval, and deletion.
 * @param server - Fastify instance to register routes on
 */
export async function registerAvatarRoutes(server: FastifyInstance)
{

	const db = getDatabase();

	/**
	 * DELETE /api/user/avatar
	 * Resets user avatar to default and removes custom avatar file
	 */
	server.delete('/api/user/avatar', async (req, res) => {

		const user = (req as any).user;

		if (!user)
			return res.code(401).send({ success: false, message: 'Lütfen tekrar giriş yapın' });

		const oldAvatar = db.getUserAvatar(user.id);
		
		// Check if user already has default avatar
		if (!oldAvatar || oldAvatar === DEFAULT_AVATAR_FILENAME)
			return res.code(400).send({ success: false, message: 'Zaten varsayılan avatarı kullanıyorsunuz' });

		// Remove custom avatar file from disk
		const oldPath = path.join(paths.usersAvatars, oldAvatar);
		try
		{
			await fs.access(oldPath);
			await fs.unlink(oldPath);
			console.log('[AVATAR] Custom avatar deleted:', oldAvatar);
		}
		catch(error)
		{
			console.log('[AVATAR] Could not delete avatar file:', error);
		}
		
		// Reset to default avatar in database
		db.updateUserAvatar(user.id, DEFAULT_AVATAR_FILENAME);

		return res.code(200).send({ success: true, message: 'Avatar sıfırlandı', avatar: `/avatars/defaults/${DEFAULT_AVATAR_FILENAME}`});
	})

	/**
	 * GET /api/user/avatar
	 * Returns the current avatar URL for the authenticated user
	 */
	server.get('/api/user/avatar', async (req, res) => {

		const user = (req as any).user;

		if (!user)
			return res.code(401).send({ success: false, message: 'Lütfen tekrar giriş yapın' });

		const avatar = db.getUserAvatar(user.id);

		if (!avatar)
			return res.code(404).send({ success: false, message: 'Avatar bulunamadı'});

		// Build avatar path based on whether it's default or custom
		let avatarPath = "";
		if (avatar === DEFAULT_AVATAR_FILENAME)
			avatarPath = `/avatars/defaults/${avatar}`;
		else
			avatarPath = `/avatars/users/${avatar}`;

		return res.code(200).send({ success: true, avatar: avatarPath });
	})

	/**
	 * POST /api/user/avatar
	 * Uploads and sets a new avatar for the authenticated user
	 * Automatically removes the previous custom avatar file
	 */
	server.post('/api/user/avatar', async (req, res) => {

		const user = (req as any).user;

		if (!user)
			return res.code(401).send({ success: false, message: 'Lütfen tekrar giriş yapın' });

		console.log('[AVATAR] Starting avatar upload for user:', user.id);

		let filename: string;
		try
		{
			// Validate file type, size and save to disk
			filename = await validateAvatar(req, user.id);
		}
		catch (error: any)
		{
			console.error('[AVATAR] Upload validation failed:', error);
			const statusCode = error.statusCode || 500;
			const message = error.message || 'Yükleme sırasında hata oluştu';
			return res.code(statusCode).send({ success: false, message });
		}
		
		console.log('[AVATAR] File saved successfully:', filename);

		// Remove old custom avatar if exists
		const oldAvatar = db.getUserAvatar(user.id);
		if (oldAvatar && oldAvatar !== DEFAULT_AVATAR_FILENAME)
		{
			try
			{
				const oldPath = path.join(paths.usersAvatars, oldAvatar);
				await fs.unlink(oldPath)
				console.log('[AVATAR] Previous avatar removed:', oldAvatar);
			}
			catch(error)
			{
				console.log('[AVATAR] Could not remove previous avatar:', error);
			}
		}

		// Update database with new avatar filename
		db.updateUserAvatar(user.id, filename);
		console.log('[AVATAR] Database updated with new avatar');

		return res.code(200).send({ success: true, message: 'Avatar başarıyla güncellendi', avatar: `/avatars/users/${filename}` })
	})
}

