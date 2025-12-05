import { BadRequest, UserError, errClient } from "@app/shared/errors.js"
import { getDatabase } from "../db/databaseSingleton.js"
import { verifyPassword } from "../utils/passwords.js";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;
const db = getDatabase()

export function validateNewPassword(newPassword: string | undefined)
{
	if (!newPassword || newPassword === undefined)
        throw new BadRequest('Yeni şifre gereklidir');
    if (newPassword.length < 6)
        throw new BadRequest('Yeni şifre en az 6 karakter olmalıdır');
    if (newPassword.length > 20)
        throw new BadRequest('Yeni şifre 20 karakteri geçemez');
    if (!PASSWORD_PATTERN.test(newPassword))
        throw new BadRequest('Yeni şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir');
}

export function validateCurrentPassword(currentPassword: string | undefined, hashedPassword: string)
{
    if (!currentPassword || currentPassword === undefined)
        throw new BadRequest('Mevcut şifre gereklidir');
    if (!verifyPassword(currentPassword, hashedPassword))
        throw new UserError('Mevcut şifre hatalı', errClient.INVALID_CREDENTIALS);
}

export function validateNewAlias(newAlias: string | undefined, userId: string, userLogin: string): void {
    if (!newAlias || newAlias === undefined)
        throw new BadRequest('Yeni takma ad gereklidir');
    
    const trimmedAlias = newAlias.trim();
    if (trimmedAlias.length < 3)
        throw new BadRequest('Yeni takma ad en az 3 karakter olmalıdır');
    if (trimmedAlias.length > 16)
        throw new BadRequest('Yeni takma ad 16 karakteri geçemez');

    if (!ALIAS_PATTERN.test(trimmedAlias))
        throw new BadRequest('Yeni takma ad sadece harf, rakam, tire ve alt çizgi içerebilir');

    if (trimmedAlias === userLogin)
        throw new BadRequest('Yeni takma ad kullanıcı adıyla aynı olamaz');
    
    const existingUser = db.getUserByAlias(trimmedAlias);
    if (existingUser && existingUser.id !== userId)
        throw new UserError('Bu takma ad zaten kullanılıyor', errClient.ALIAS_ALREADY_TAKEN, 409);
}