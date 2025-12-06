/**
 * @class GameObject
 * @brief Base class for all game entities
 */
export abstract class GameObject {
    public positionX: number;
    public positionY: number;
    public width: number = 0;
    public height: number = 0;

    constructor(x: number, y: number) {
        this.positionX = x;
        this.positionY = y;
    }

    /**
     * @brief Generic update method to be implemented by subclasses
     * @param deltaTime Time elapsed since last frame
     */
    public abstract update(deltaTime: number): void;

    /**
     * @brief Helper for logging entity events
     * @param action Action being performed
     * @param details Optional details
     */
    protected logEvent(action: string, details?: string): void {
        // Logging can be enabled/disabled here
        // console.log(`[${this.constructor.name}] ${action} ${details || ''}`);
    }
}
