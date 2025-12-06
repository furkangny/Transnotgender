import { BadRequest, UserError, errClient } from "@app/shared/errors.js"
import { getDatabase } from "../db/databaseSingleton.js"
import { verifyPassword } from "../utils/passwords.js";
import { BaseValidator } from "./core/BaseValidator.js";

class UserValidator extends BaseValidator {
    private db = getDatabase();

    public validateNewPassword(newPassword: string | undefined): void {
        if (!newPassword) throw new BadRequest('Yeni şifre gereklidir');
        this.validateString(newPassword, 'Yeni şifre', 6, 20);
        this.validatePattern(newPassword, this.PATTERNS.PASSWORD, 'Yeni şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir');
    }

    public validateCurrentPassword(currentPassword: string | undefined, hashedPassword: string): void {
        if (!currentPassword) throw new BadRequest('Mevcut şifre gereklidir');
        if (!verifyPassword(currentPassword, hashedPassword)) {
            throw new UserError('Mevcut şifre hatalı', errClient.INVALID_CREDENTIALS);
        }
    }

    public validateNewAlias(newAlias: string | undefined, userId: string, userLogin: string): void {
        if (!newAlias) throw new BadRequest('Yeni takma ad gereklidir');
        
        const trimmedAlias = newAlias.trim();
        this.validateString(trimmedAlias, 'Yeni takma ad', 3, 16);
        this.validatePattern(trimmedAlias, this.PATTERNS.ALIAS, 'Yeni takma ad sadece harf, rakam, tire ve alt çizgi içerebilir');

        if (trimmedAlias === userLogin) {
            throw new BadRequest('Yeni takma ad kullanıcı adıyla aynı olamaz');
        }
        
        const existingUser = this.db.getUserByAlias(trimmedAlias);
        if (existingUser && existingUser.id !== userId) {
            throw new UserError('Bu takma ad zaten kullanılıyor', errClient.ALIAS_ALREADY_TAKEN, 409);
        }
    }
}

const validator = new UserValidator();

export function validateNewPassword(newPassword: string | undefined) {
    return validator.validateNewPassword(newPassword);
}

export function validateCurrentPassword(currentPassword: string | undefined, hashedPassword: string) {
    return validator.validateCurrentPassword(currentPassword, hashedPassword);
}

export function validateNewAlias(newAlias: string | undefined, userId: string, userLogin: string): void {
    return validator.validateNewAlias(newAlias, userId, userLogin);
}
