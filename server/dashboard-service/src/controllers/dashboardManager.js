/*
 * Dashboard Manager Controller
 * Handles live dashboard WebSocket connections
 */
import { validateToken } from "../middleware/tokenGuard.js";
import { showDashboard } from "../utils/helpers.js";

const activeUsers = new Map();

export async function fetchLiveDashboard(wsSocket, req) {
    try {
        wsSocket.userId = null;
        wsSocket.isAuthenticated = false;
        await validateToken(wsSocket, req, this.redis);
        if (wsSocket.userId) {
            if (!activeUsers.has(wsSocket.userId))
                activeUsers.set(wsSocket.userId, new Set());
            activeUsers.get(wsSocket.userId).add(wsSocket);
            showDashboard(this.redis, wsSocket, this.rabbit);
        }
        else {
            wsSocket.close(3000, 'Unauthorized');
            return;
        }

        setInterval(showDashboard, 5000, this.redis, wsSocket, this.rabbit);

        wsSocket.on('error', (err) => {
            console.error('FastifyWebSocket: Client error:', err);
        });

        wsSocket.on('close', () => {
            console.log('FastifyWebSocket: Client disconnected.');
        });
    } catch (err) {
        console.log(err);
        wsSocket.close(1008, 'Malformed payload');
    }
}
