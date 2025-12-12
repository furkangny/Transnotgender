import { validateToken } from "../middleware/tokenGuard.js";
import { showDashboard } from "../utils/helpers.js";


const users = new Map();

export async function fetchLiveDashboard(socket, request) {
    try {
        socket.userId = null;
        socket.isAuthenticated = false;
        await validateToken(socket, request, this.redis);
        if (socket.userId) {
            if (!users.has(socket.userId))
                users.set(socket.userId, new Set());
            users.get(socket.userId).add(socket);
            showDashboard(this.redis, socket, this.rabbit);
        }
        else {
            socket.close(3000, 'Unauthorized');
            return;
        }

        setInterval(showDashboard, 5000, this.redis, socket, this.rabbit);

        socket.on('error', (error) => {
            console.error('FastifyWebSocket: Client error:', error);
        });

        socket.on('close', () => {
            console.log('FastifyWebSocket: Client disconnected.');
        })
    } catch (error) {
        console.log(error);
        socket.close(1008, 'Malformed payload');
    }
}
