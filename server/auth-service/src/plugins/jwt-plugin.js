/*
 * JWT Plugin - Token Management
 * Handles signing and verification of access, refresh, and temporary tokens
 */
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { createResponse } from "../utils/helpers.js";
import { getSessionCookies, getTempSessionToken } from "../utils/cookieManager.js";

async function jwtPlugin(fastify, options) {
  const { accessTokenKey, refreshTokenKey, tempTokenKey } = options;

  fastify.decorate("jwt", {
    // TT = Temporary Token (5 min) - used for 2FA flow
    signTT(tokenPayload, duration = "5m") {
      try {
        return jwt.sign(tokenPayload, tempTokenKey, { expiresIn: duration });
      } catch (err) {
        console.log("Error in signing temp token: ", err);
        throw new Error(err);
      }
    },

    // AT = Access Token (15 min) - main auth token
    async signAT(tokenPayload, duration = "15m") {
      try {
        return jwt.sign(tokenPayload, accessTokenKey, { expiresIn: duration });
      } catch (err) {
        console.log("Error in signing access token: ", err);
        throw new Error(err);
      }
    },

    // RT = Refresh Token (7 days) - for token renewal
    signRT(tokenPayload, duration = "7d") {
      try {
        delete tokenPayload.exp;
        return jwt.sign(tokenPayload, refreshTokenKey, { expiresIn: duration });
      } catch (err) {
        console.log("Error in signing refresh token: ", err);
        throw new Error(err);
      }
    },

    verifyAT(tokenString) {
      try {
        return jwt.verify(tokenString, accessTokenKey);
      } catch (err) {
        console.log("Error in verifying access token: ", err);
        throw new Error(err);
      }
    },

    verifyRT(tokenString) {
      try {
        return jwt.verify(tokenString, refreshTokenKey);
      } catch (err) {
        console.log("Error in verifying refresh token: ", err);
        throw new Error(err);
      }
    },

    verifyTT(tokenString) {
      try {
        return jwt.verify(tokenString, tempTokenKey);
      } catch (err) {
        console.log("Error in verifying temp token: ", err);
        throw new Error(err);
      }
    },
  });

  // Authentication middleware
  fastify.decorate("authenticate", async (request, reply) => {
    try {
      let cookieData = getSessionCookies(request);
      let decodedPayload;
      
      if (!cookieData.accessToken) {
        cookieData = getTempSessionToken(request);
        if (!cookieData) {
          return reply.code(401).send(createResponse(401, "TOKEN_REQUIRED"));
        }
        try {
          decodedPayload = await fastify.jwt.verifyTT(cookieData);
          request.user = decodedPayload;
          return;
        } catch (err) {
          if (err.name === "TokenExpiredError") {
            return reply.code(401).send(createResponse(401, "TEMP_TOKEN_EXPIRED"));
          }
          return reply.code(401).send(createResponse(401, "TEMP_TOKEN_INVALID"));
        }
      }
      
      try {
        decodedPayload = await fastify.jwt.verifyAT(cookieData.accessToken);
        request.user = decodedPayload;
        return;
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return reply.code(401).send(createResponse(401, "ACCESS_TOKEN_EXPIRED"));
        }
        return reply.code(401).send(createResponse(401, "ACCESS_TOKEN_INVALID"));
      }
    } catch (err) {
      console.log("Error while authenticating: ", err);
      return reply.code(500).send(createResponse(500, "INTERNAL_SERVER_ERROR"));
    }
  });
}

export default fp(jwtPlugin);
