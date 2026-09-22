import { createAuthRepository } from "../db/auth.repository.js";
import { AppError } from "../errors/app-error.js";
import { tokenService } from "../utils/jwt.js";

function unauthorizedError() {
  return new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
  });
}

function readBearerToken(header) {
  if (typeof header !== "string") {
    throw unauthorizedError();
  }

  const match = /^Bearer ([^\s]+)$/.exec(header);

  if (!match) {
    throw unauthorizedError();
  }

  return match[1];
}

export function createAuthenticateAccessToken({
  accessTokenService = tokenService,
  authRepository = createAuthRepository(),
} = {}) {
  return async function authenticateAccessToken(request, _response, next) {
    let claims;

    try {
      const token = readBearerToken(request.headers.authorization);
      claims = await accessTokenService.verifyAccessToken(token);
    } catch {
      next(unauthorizedError());
      return;
    }

    const account = await authRepository.findActiveAccountById(claims);

    if (!account) {
      next(unauthorizedError());
      return;
    }

    request.auth = {
      accountId: claims.accountId,
      role: claims.role,
      account,
    };
    next();
  };
}
