/**
 * @file TournamentLogger.ts
 * @brief Logger for tournament events.
 */
export class TournamentLogger {
    private tournamentId: string;

    constructor(tournamentId: string) {
        this.tournamentId = tournamentId;
    }

    public log(message: string, data?: any): void {
        console.log(`[TOURNAMENT-${this.tournamentId}] ${message}`, data ? JSON.stringify(data) : '');
    }

    public logMatchUpdate(matchId: string, status: string): void {
        this.log(`Match ${matchId} status updated to ${status}`);
    }
}
