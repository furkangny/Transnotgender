/*
 * Dashboard Endpoints
 * Routes for dashboard service
 */
import { fetchLiveDashboard } from "../controllers/dashboardManager.js";

export async function dashboardEndpoints(fastify) {
    /* Live dashboard WebSocket */
    fastify.get('/live', {
        websocket: true,
        handler: fetchLiveDashboard
    });
}
