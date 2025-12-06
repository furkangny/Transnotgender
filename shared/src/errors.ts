export class AppError extends Error {
    public readonly timestamp: Date;
    public readonly statusCode: number;
    public readonly code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.timestamp = new Date();
    }

    public toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            timestamp: this.timestamp
        };
    }
}

export class InputValidationError extends AppError {
    constructor(message: string, status: number = 400) {
        super(message, status);
    }

    // Backward compatibility getter
    get status(): number {
        return this.statusCode;
    }
}

export class InternalSystemError extends AppError {
    constructor(message: string, code?: string, statusCode: number = 500) {
        super(message, statusCode, code);
    }
}

export class DataPersistenceError extends AppError {
    constructor(message: string, code?: string, statusCode: number = 500) {
        super(message, statusCode, code);
    }
}

export class BusinessLogicError extends AppError {
    constructor(message: string, code?: string, statusCode: number = 400) {
        super(message, statusCode, code);
    }
}

// Aliases for backward compatibility
export { InputValidationError as BadRequest };
export { InternalSystemError as ServerError };
export { DataPersistenceError as DatabaseError };
export { BusinessLogicError as UserError };

export class TournamentOperationError extends AppError {
    constructor(message: string, code?: string, statusCode: number = 500) {
        super(message, statusCode, code);
    }
}

export class BracketStructureError extends AppError {
    constructor(message: string, code?: string, statusCode: number = 500) {
        super(message, statusCode, code);
    }
}

export { TournamentOperationError as TournamentError };
export { BracketStructureError as BracketError };


export enum errTournament {

	ALREADY_EXISTING = 'ALREADY_EXISTING',
	NOT_EXISTING = 'NOT_EXISTING',
	ALREADY_STARTED = 'ALREADY_STARTED',
	ALREADY_OVER = 'ALREADY_OVER',
	TOURNAMENT_FULL = 'TOURNAMENT_FULL'

};

export enum errClient {
	DUPLICATE_LOGIN = 'DUPLICATE_LOGIN',
	DUPLICATE_NAME = 'DUPLICATE_NAME',
	ALREADY_IN_TOURNAMENT = 'ALREADY_IN_TOURNAMENT',
	UNAUTHENTICATED_PLAYER = 'UNAUTHENTICATED_PLAYER',
	NONEXISTING_PLAYER = 'NONEXISTING_PLAYER',
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
	ALIAS_ALREADY_TAKEN = 'ALIAS_ALREADY_TAKEN'
};

export enum errDatabase {
	USERNAME_ALREADY_TAKEN = 'USERNAME_ALREADY_TAKEN',
	ALIAS_ALREADY_TAKEN = 'ALIAS_ALREADY_TAKEN',
	PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND'
}

//TODO adapts erros numbers for each thrown error