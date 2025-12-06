import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { paths } from '../config/paths.js'
import { randomUUID } from 'crypto'
import { FastifyRequest } from 'fastify'
import { BadRequest } from '@app/shared/errors.js'
import { BaseValidator } from "./core/BaseValidator.js";

class AvatarValidator extends BaseValidator {
    private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png'];
    private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB

    public async validateAndProcess(req: FastifyRequest, userId: string): Promise<string> {
        const data = await req.file();

        if (!data) {
            throw new BadRequest('Dosya sağlanmadı', 404);
        }

        this.log(`Processing avatar upload for user ${userId}, mimetype: ${data.mimetype}`);

        if (!this.ALLOWED_TYPES.includes(data.mimetype)) {
            throw new BadRequest('Geçersiz format. İzin verilen formatlar JPEG ve PNG', 400);
        }

        const buffer = await data.toBuffer();

        if (buffer.length > this.MAX_SIZE) {
            throw new BadRequest('Dosya çok büyük. İzin verilen maksimum boyut 5MB', 413);
        }

        const fileExtension = path.extname(data.filename) || '.png';
        const filename = `${userId}-${randomUUID()}.png`;
        const filepath = path.join(paths.usersAvatars, filename);

        await sharp(buffer)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center'
            })
            .png({ quality: 90 })
            .toFile(filepath);
        
        this.log(`Avatar saved to ${filepath}`);

        return filename;
    }
}

const validator = new AvatarValidator();

export async function validateAvatar(req: FastifyRequest, userId: string): Promise<string> {
    return validator.validateAndProcess(req, userId);
}
