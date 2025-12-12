import { validateToken } from "../middleware/tokenGuard.js"
import { applyRestriction, liftRestriction, fetchRestrictions, checkRestrictionStatus } from '../controllers/restrictionManager.js'
import { restrictionSchema } from "../schemas/restrictionSchemas.js";

async function restrictionEndpoints(fastify) {
    fastify.post('/:blockedId', {
        schema: {
            params: restrictionSchema
        },
        preHandler: validateToken,
        handler: applyRestriction
    })

    fastify.delete('/:blockedId', {
        schema: {
            params: restrictionSchema
        },
        preHandler: validateToken,
        handler: liftRestriction
    })

    fastify.get('/list', {
        preHandler: validateToken,
        handler: fetchRestrictions
    })

    fastify.get('/isBlocked/:blockedId', {
        schema: {
            params: restrictionSchema
        },
        preHandler: validateToken,
        handler: checkRestrictionStatus,
    })
}

export default restrictionEndpoints;
