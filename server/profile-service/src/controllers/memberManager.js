/*
 * Member Manager Controller
 * Handles profile CRUD operations and avatar uploads
 */

import {
    retrieveAllMembers,
    checkUsernameExists,
    locateMemberById,
    modifyMemberPhotoById,
    modifyMemberById
} from "../models/memberRepository.js";
import { createResponse, displayOnlineStatuses } from "../utils/helpers.js";
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { verifyWSToken } from "../middleware/tokenGuard.js";

// Allowed image extensions
const ALLOWED_EXTENSIONS = ['.webp', '.jpeg', '.jpg', '.png'];

/*
 * Get Member Profile
 */
export async function fetchMemberDetails(req, res) {
    try {
        const { id } = req.params;

        const profile = await locateMemberById(this.db, id);
        if (!profile)
            return res.code(400).send(createResponse(400, 'PROFILE_NOT_FOUND'));

        return res.code(200).send(createResponse(200, 'PROFILE_FETCHED', { profile: profile }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Update Member Profile
 */
export async function modifyMemberDetails(req, res) {
    try {
        const { id } = req.params;
        const tokenId = req.user?.id;
        if (tokenId != id)
            return res.code(403).send(createResponse(403, 'UNAUTHORIZED'));

        const { username, matches_won, matches_lost, hasWon } = req.body;

        const profile = await locateMemberById(this.db, id);
        if (!profile)
            return res.code(400).send(createResponse(400, 'PROFILE_NOT_FOUND'));

        const updatedFields = {};
        if (username) {
            const duplicateUser = await checkUsernameExists(this.db, username);
            if (duplicateUser)
                return res.code(400).send(createResponse(400, 'USERNAME_EXISTS'));
            updatedFields.username = username;
            this.rabbit.produceMessage({
                id: id,
                username: username
            }, 'auth.username.updated');
        }

        if (matches_won !== undefined && hasWon) {
            updatedFields.matches_won = matches_won;
            updatedFields.matches_played = profile.matches_lost + matches_won;
            updatedFields.level = (matches_won * 100 + profile.matches_lost * 50) / 500;
        }
        if (matches_lost !== undefined && !hasWon) {
            updatedFields.matches_lost = matches_lost;
            updatedFields.matches_played = profile.matches_won + matches_lost;
            updatedFields.level = (matches_lost * 50 + profile.matches_won * 100) / 500;
        }


        if (Object.keys(updatedFields).length === 0)
            return res.code(400).send(createResponse(400, 'MISSING_FIELDS'));

        const changes = await modifyMemberById(this.db, id, updatedFields);
        if (changes === 0)
            return res.code(400).send(createResponse(400, 'ZERO_CHANGES'));
        const updatedProfile = await locateMemberById(this.db, id);
        await this.redis.sendCommand([
            'JSON.SET',
            `player:${tokenId}`,
            '$',
            JSON.stringify(updatedProfile)
        ])


        return res.code(200).send(createResponse(200, 'PROFILE_UPDATED', { profile: updatedProfile }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Upload Member Avatar
 */
export async function uploadMemberPhoto(req, res) {
    try {
        const memberId = req.user?.id;
        const fileData = await req.file();
        fileData.file.on('limit', () => {
            return res.code(413).send(createResponse(400, 'FILE_TOO_LARGE'));
        })
        console.log('DATA received: ', fileData);
        if (!fileData)
            return res.code(400).send(createResponse(400, 'FILE_REQUIRED'));

        const fileExt = path.extname(fileData.filename);
        if (!ALLOWED_EXTENSIONS.includes(fileExt))
            return res.code(400).send(createResponse(400, 'UNSUPPORTED_FILE_TYPE'));
        const fileName = `${memberId}_${Date.now()}${fileExt}`;
        const uploadPath = path.join(process.cwd(), 'uploads', 'avatars', fileName);
        console.log("Upload path: ", uploadPath);
        fs.mkdirSync(path.dirname(uploadPath), { recursive: true });

        await pipeline(fileData.file, fs.createWriteStream(uploadPath));

        await modifyMemberPhotoById(this.db, memberId, fileName);
        const updatedProfile = await locateMemberById(this.db, memberId);
        await this.redis.sendCommand([
            'JSON.SET',
            `player:${memberId}`,
            '$',
            JSON.stringify(updatedProfile)
        ])
        return res.code(200).send(createResponse(200, 'AVATAR_UPLOADED', { avatar_url: fileName }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Get Member Avatar
 */
export async function fetchMemberPhoto(req, res) {
    try {
        const { fileName } = req.params;
        if (!fileName)
            return res.code(400).send(createResponse(400, 'FILENAME_REQUIRED'));

        const filePath = path.join(process.cwd(), 'uploads', 'avatars', fileName);
        if (!fs.existsSync(filePath))
            return res.code(404).send(createResponse(404, 'FILE_NOT_FOUND'));

        const fileExt = path.extname(fileName).toLowerCase();
        const mimeType = ((fileExt === '.jpeg' || fileExt === '.jpg') ? 'image/jpeg' :
            fileExt === '.png' ? 'image/png' :
                fileExt === '.webp' ? 'image/webp' :
                    'application/octet-stream');
        const stream = fs.createReadStream(filePath);

        stream.on('error', (streamErr) => {
            console.error('Stream error:', streamErr);
            res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
        });

        return res.type(mimeType).send(stream);
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}

/*
 * Get All Members
 */
export async function fetchAllMembers(req, res) {
    try {
        const allProfiles = await retrieveAllMembers(this.db);
        return res.code(200).send(createResponse(200, 'PROFILES_FETCHED', { profiles: allProfiles }));
    } catch (err) {
        console.log(err);
        return res.code(500).send(createResponse(500, 'INTERNAL_SERVER_ERROR'));
    }
}


// Active WebSocket connections by userId
const activeConnections = new Map();

/*
 * WebSocket - Online Status Tracker
 */
export async function retrieveOnlineStates(socket, req) {
    try {
        socket.userId = null;
        socket.isAuthenticated = false;
        await verifyWSToken(socket, req, this.redis);
        if (socket.userId) {
            if (!activeConnections.has(socket.userId))
                activeConnections.set(socket.userId, new Set());
            activeConnections.get(socket.userId).add(socket);
            displayOnlineStatuses(this.db, socket, activeConnections);
        }
        else {
            socket.close(3000, 'Unauthorized');
            return;
        }

        setInterval(displayOnlineStatuses, 5000, this.db, socket, activeConnections);

        socket.on('error', (socketErr) => {
            console.error('FastifyWebSocket: Client error:', socketErr);
        });

        socket.on('close', () => {
            console.log('FastifyWebSocket: Client disconnected.');
            if (socket.isAuthenticated && activeConnections.has(socket.userId)) {
                activeConnections.get(socket.userId).delete(socket);
                if (activeConnections.get(socket.userId).size === 0)
                    activeConnections.delete(socket.userId);
            }
        })
    } catch (err) {
        console.log(err);
        socket.close(1008, 'Malformed payload');
    }
}
