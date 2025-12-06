import { BadRequest } from "@app/shared/errors.js";

export class BaseValidator {
    protected readonly PATTERNS = {
        PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
        LOGIN: /^[a-zA-Z0-9_!@#$%&*=-]+$/,
        ALIAS: /^[a-zA-Z0-9_ -]+$/
    };

    protected log(message: string): void {
        console.log(`[VALIDATION] ${message}`);
    }

    protected validateString(value: any, fieldName: string, min: number, max: number): void {
        if (typeof value !== 'string') {
            throw new BadRequest(`${fieldName} metin formatında olmalıdır`);
        }
        const trimmed = value.trim();
        if (trimmed.length < min) {
            throw new BadRequest(`${fieldName} en az ${min} karakter olmalıdır`);
        }
        if (trimmed.length > max) {
            throw new BadRequest(`${fieldName} ${max} karakterden uzun olmamalıdır`);
        }
    }

    protected validatePattern(value: string, pattern: RegExp, errorMessage: string): void {
        if (!pattern.test(value)) {
            throw new BadRequest(errorMessage);
        }
    }
}
