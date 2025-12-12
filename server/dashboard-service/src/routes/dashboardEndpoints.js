import { fetchLiveDashboard } from "../controllers/dashboardManager.js";

export async function dashboardEndpoints(fastify) {
    fastify.get('/live', {
        websocket: true,
        handler: fetchLiveDashboard
    });
}
