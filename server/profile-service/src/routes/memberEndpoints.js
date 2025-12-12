import { retrieveOnlineStates, fetchAllMembers, fetchMemberPhoto, fetchMemberDetails, modifyMemberDetails, uploadMemberPhoto } from "../controllers/memberManager.js";
import { validateToken } from "../middleware/tokenGuard.js";
import { memberIdSchema, modifyMemberSchema } from "../schemas/memberSchemas.js";

async function memberEndpoints(fastify) {
    fastify.get('/statuses', {
        websocket: true,
        handler: retrieveOnlineStates
    });

    fastify.get('/all', {
        preHandler: validateToken,
        handler: fetchAllMembers
    })

    fastify.post('/upload', {
        preHandler: validateToken,
        handler: uploadMemberPhoto
    })

    fastify.get('/avatar/:fileName', {
        preHandler: validateToken,
        handler: fetchMemberPhoto
    })

    fastify.get('/user/:id', {
        schema: {
            params: memberIdSchema
        },
        preHandler: validateToken,
        handler: fetchMemberDetails
    })

    fastify.patch('/user/:id', {
        schema: {
            params: memberIdSchema,
            body: modifyMemberSchema
        },
        preHandler: validateToken,
        handler: modifyMemberDetails
    })
}

export default memberEndpoints;
