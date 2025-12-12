import { fortyTwoLoginHandler, fortyTwoSetupHandler } from '../controllers/42OAuthController.js';
import {
    authenticateUser,
    createAccount,
    terminateSession,
    fetchCurrentUser,
    renewAccessToken,
    confirmResetCode,
    initiatePasswordReset,
    changeUserPassword,
    modifyCredentials,
    confirmCredentialChange,
    removeUserAccount
} from '../controllers/sessionManager.js';
import {
    googleLoginHandler,
    googleSetupHandler
} from '../controllers/googleOAuthController.js';
import {
    registerSchema,
    loginSchema,
    otpCodeSchema,
    emailSchema,
    passwordSchema,
    updateCredentialsSchema
} from '../schemas/sessionSchemas.js';
import { strictRateLimit } from '../schemas/rateLimitSchema.js';


async function sessionEndpoints(fastify) {
    fastify.post('/login', {
        config: strictRateLimit,
        schema: {
            body: loginSchema
        },
        handler: authenticateUser
    });

    fastify.post('/register', {
        config: strictRateLimit,
        schema: {
            body: registerSchema
        },
        handler: createAccount
    });

    fastify.post('/logout', {
        preHandler: fastify.authenticate,
        handler: terminateSession
    });

    fastify.get('/me', {
        preHandler: fastify.authenticate,
        handler: fetchCurrentUser
    });

    fastify.post('/refresh', {
        handler: renewAccessToken
    });

    fastify.get('/google', {
        config: strictRateLimit,
        handler: googleSetupHandler
    });

    fastify.get('/google/callback', {
        handler: googleLoginHandler
    });

    fastify.get('/42', {
        config: strictRateLimit,
        handler: fortyTwoSetupHandler
    });

    fastify.get('/42/callback', {
        handler: fortyTwoLoginHandler
    });

    fastify.post('/lost-password', {
        config: strictRateLimit,
        schema: {
            body: emailSchema
        },
        handler: initiatePasswordReset
    });

    fastify.post('/verify-code', {
        config: strictRateLimit,
        schema: {
            body: otpCodeSchema
        },
        preHandler: fastify.authenticate,
        handler: confirmResetCode
    });

    fastify.post('/update-password', {
        config: strictRateLimit,
        schema: {
            body: passwordSchema
        },
        preHandler: fastify.authenticate,
        handler: changeUserPassword
    });

    fastify.post('/update-credentials', {
        config: strictRateLimit,
        schema: {
            body: updateCredentialsSchema
        },
        preHandler: fastify.authenticate,
        handler: modifyCredentials
    });

    fastify.post('/verify-update-credentials', {
        config: strictRateLimit,
        schema: {
            body: otpCodeSchema
        },
        preHandler: fastify.authenticate,
        handler: confirmCredentialChange
    });

    fastify.delete('/delete', {
        config: strictRateLimit,
        preHandler: fastify.authenticate,
        handler: removeUserAccount
    });
}

export default sessionEndpoints;
