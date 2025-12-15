/*
 * Restriction Endpoints
 * Routes for blocking users
 */
import { validateToken } from "../middleware/tokenGuard.js"
import { applyRestriction, liftRestriction, fetchRestrictions, checkRestrictionStatus } from '../controllers/restrictionManager.js'
import { restrictionSchema } from "../schemas/restrictionSchemas.js";

async function restrictionEndpoints(fastify) {
    /* Block user */
    fastify.post('/:blockedId', {
        schema: {
            params: restrictionSchema
        },
        preHandler: validateToken,
        handler: applyRestriction
    });

    /* Unblock user */
    fastify.delete('/:blockedId', {
        schema: {
            params: restrictionSchema
        },
        preHandler: validateToken,
        handler: liftRestriction
    });

    /* Get block list */
    fastify.get('/list', {
        preHandler: validateToken,
        handler: fetchRestrictions
    });

    /* Check block status */
    fastify.get('/isBlocked/:blockedId', {
        schema: {
            params: restrictionSchema
        },
        preHandler: validateToken,
        handler: checkRestrictionStatus,
    });
}

export default restrictionEndpoints;
