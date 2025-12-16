/*
 * Connection Endpoints
 * Routes for friend management
 */
import { initiateConnection, approveConnection, declineConnection, terminateConnection, fetchConnections, fetchPendingConnections } from "../controllers/connectionManager.js";
import { validateToken } from "../middleware/tokenGuard.js";
import { connectionRequestSchema, connectionDecisionSchema, friendIdSchema } from "../schemas/connectionSchemas.js";

async function connectionEndpoints(fastify) {
    /* Send friend request */
    fastify.post('/request', {
        schema: {
            body: connectionRequestSchema
        },
        preHandler: validateToken,
        handler: initiateConnection
    });

    /* Accept friend request */
    fastify.post('/accept', {
        schema: {
            body: connectionDecisionSchema
        },
        preHandler: validateToken,
        handler: approveConnection
    });

    /* Reject friend request */
    fastify.post('/reject', {
        schema: {
            body: connectionDecisionSchema
        },
        preHandler: validateToken,
        handler: declineConnection
    });

    /* Remove friend */
    fastify.delete('/:friendId', {
        schema: {
            params: friendIdSchema
        },
        preHandler: validateToken,
        handler: terminateConnection
    });

    /* Get friends list */
    fastify.get('/', {
        preHandler: validateToken,
        handler: fetchConnections
    });

    /* Get pending requests */
    fastify.get('/requests', {
        preHandler: validateToken,
        handler: fetchPendingConnections
    });
}

export default connectionEndpoints;
