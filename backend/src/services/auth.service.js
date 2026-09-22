import { AppError } from "../errors/app-error.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { toPublicAccount } from "../utils/public-account.js";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$YMiMv1ZqNjxng+c37KUKNA$a0UQt97wyQiZeRyNH9pagD+nLsDGDiXL9Fy9Dc9RByc";

function invalidCredentialsError() {
  return new AppError({
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "Sai tài khoản hoặc mật khẩu.",
  });
}

function conflictError(field, message) {
  return new AppError({
    statusCode: 409,
    code: "ACCOUNT_CONFLICT",
    message: "Thông tin đăng ký đã được sử dụng.",
    fields: { [field]: message },
  });
}

function mapCustomerUniqueViolation(error) {
  if (error?.code !== "23505") {
    return null;
  }

  if (error.constraint === "customers_email_key") {
    return conflictError("email", "Email đã được sử dụng.");
  }

  if (error.constraint === "customers_phone_key") {
    return conflictError("phone", "Số điện thoại đã được sử dụng.");
  }

  return null;
}

export function createAuthService({ authRepository, accessTokenService }) {
  return {
    async registerCustomer({ fullName, email, phone, password }) {
      const passwordHash = await hashPassword(password);

      try {
        const customer = await authRepository.createCustomer({
          fullName,
          email,
          phone,
          passwordHash,
        });
        return toPublicAccount(customer, "customer");
      } catch (error) {
        const conflict = mapCustomerUniqueViolation(error);

        if (conflict) {
          throw conflict;
        }

        throw error;
      }
    },

    async loginCustomer({ identifier, password }) {
      const normalizedIdentifier = identifier.includes("@")
        ? identifier.toLowerCase()
        : identifier;
      const customer = await authRepository.findCustomerCredentialsByIdentifier(normalizedIdentifier);
      const passwordMatches = await verifyPassword(
        customer?.password_hash ?? DUMMY_PASSWORD_HASH,
        password,
      );

      if (!customer || !passwordMatches) {
        throw invalidCredentialsError();
      }

      const accessToken = await accessTokenService.signAccessToken({
        accountId: customer.id,
        role: "customer",
      });

      return {
        accessToken,
        account: toPublicAccount(customer, "customer"),
      };
    },
  };
}
