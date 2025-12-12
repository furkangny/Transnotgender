import { initiateConnection, approveConnection, declineConnection, terminateConnection, fetchConnections, fetchPendingConnections } from "../controllers/connectionManager.js";
import { validateToken } from "../middleware/tokenGuard.js";
import { connectionRequestSchema, friendIdSchema } from "../schemas/connectionSchemas.js";

async function connectionEndpoints(fastify) {
    fastify.post('/', {
        schema: {
            body: connectionRequestSchema
        },
        preHandler: validateToken,
        handler: initiateConnection
    })

    fastify.post('/accept', {
        schema: {
            body: connectionRequestSchema
        },
        preHandler: validateToken,
        handler: approveConnection
    })

    fastify.post('/reject', {
        schema: {
            body: connectionRequestSchema
        },
        preHandler: validateToken,
        handler: declineConnection
    })

    fastify.delete('/:friendId', {
        schema: {
            params: friendIdSchema
        },
        preHandler: validateToken,
        handler: terminateConnection
    })

    fastify.get('/', {
        preHandler: validateToken,
        handler: fetchConnections
    })

    fastify.get('/requests', {
        preHandler: validateToken,
        handler: fetchPendingConnections
    })
}

export default connectionEndpoints;
