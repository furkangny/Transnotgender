import { Player } from './types.js'

/**
 * @file QueueManager.ts
 * @brief Manages player queues for different game modes.
 */
export class QueueManager {
    private queues: Map<string, Player[]> = new Map();

    constructor() {
        this.queues.set('normal', []);
        this.queues.set('custom', []);
    }

    /**
     * @brief Adds a player to the specified queue.
     */
    public enqueue(player: Player, mode: 'normal' | 'custom'): void {
        const queue = this.queues.get(mode);
        if (queue) {
            queue.push(player);
        }
    }

    /**
     * @brief Removes and returns the next player from the specified queue.
     */
    public dequeue(mode: 'normal' | 'custom'): Player | undefined {
        const queue = this.queues.get(mode);
        return queue ? queue.pop() : undefined;
    }

    /**
     * @brief Returns the number of players in the specified queue.
     */
    public getQueueLength(mode: 'normal' | 'custom'): number {
        return this.queues.get(mode)?.length || 0;
    }

    /**
     * @brief Removes a player from all queues by socket.
     */
    public removePlayer(socket: any): boolean {
        let removed = false;
        this.queues.forEach((queue) => {
            const index = queue.findIndex(p => p.socket === socket);
            if (index > -1) {
                queue.splice(index, 1);
                removed = true;
            }
        });
        return removed;
    }
}
