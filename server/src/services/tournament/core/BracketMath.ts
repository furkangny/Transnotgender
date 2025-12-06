/**
 * @file BracketMath.ts
 * @brief Mathematical utilities for tournament bracket calculations.
 */
export class BracketMath {
    public static calculateTotalMatches(playerCount: number): number {
        return playerCount - 1;
    }

    public static calculateMatchesForRound(playerCount: number): number {
        return Math.floor(playerCount / 2);
    }
}
