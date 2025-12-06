/**
 * @file DecisionLogger.ts
 * @brief Handles logging of AI decision metrics
 */

export class DecisionLogger {
    private readonly _playerId: string;

    constructor(playerId: string) {
        this._playerId = playerId;
    }

    /**
     * @brief Logs a strategic decision made by the AI
     * @param context The context of the decision (e.g., "Defense", "Attack")
     * @param details Additional details about the decision
     */
    public logStrategy(context: string, details: Record<string, any>): void {
        // In a real production environment, this might write to a file or a monitoring service.
        // For now, we keep it minimal to avoid cluttering stdout too much, 
        // or we can enable it via an environment variable.
        if (process.env.AI_DEBUG === 'true') {
            console.log(`[AI-${this._playerId}] [${context}]`, JSON.stringify(details));
        }
    }

    /**
     * @brief Logs movement adjustments
     * @param currentY Current paddle position
     * @param targetY Target paddle position
     */
    public logMovement(currentY: number, targetY: number): void {
        if (process.env.AI_DEBUG === 'true') {
             const diff = Math.abs(currentY - targetY);
             if (diff > 10) {
                 console.log(`[AI-${this._playerId}] Moving delta: ${diff.toFixed(2)}`);
             }
        }
    }
}
