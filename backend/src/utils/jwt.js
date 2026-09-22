import { SignJWT, jwtVerify } from "jose";
import { TextEncoder } from "node:util";
import { z } from "zod";

import { env } from "../config/env.js";

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = "sai-api";
const JWT_AUDIENCE = "sai-web";
const TOKEN_TTL_SECONDS = {
  customer: 24 * 60 * 60,
  admin: 8 * 60 * 60,
};

const tokenClaimsSchema = z.object({
  sub: z.string().regex(/^[1-9][0-9]*$/),
  role: z.enum(["customer", "admin"]),
  iat: z.number().int(),
  exp: z.number().int(),
});

export function createTokenService(secret = env.JWT_SECRET) {
  const key = new TextEncoder().encode(secret);

  return {
    async signAccessToken({ accountId, role }) {
      const ttl = TOKEN_TTL_SECONDS[role];

      if (!ttl || !/^[1-9][0-9]*$/.test(String(accountId))) {
        throw new TypeError("Invalid access token subject or role.");
      }

      return new SignJWT({ role })
        .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
        .setSubject(String(accountId))
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${ttl}s`)
        .sign(key);
    },

    async verifyAccessToken(token) {
      const { payload } = await jwtVerify(token, key, {
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        requiredClaims: ["sub", "role", "iat", "exp"],
      });
      const claims = tokenClaimsSchema.parse(payload);

      return {
        accountId: claims.sub,
        role: claims.role,
        issuedAt: claims.iat,
        expiresAt: claims.exp,
      };
    },
  };
}

export const tokenService = createTokenService();
