import { AppError } from "../errors/app-error.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

function notFoundError() {
  return new AppError({
    statusCode: 404,
    code: "ACCOUNT_NOT_FOUND",
    message: "Không tìm thấy tài khoản.",
  });
}

function toProfile(account) {
  const hasAddress = account.default_province !== null;

  return {
    id: account.id,
    role: "customer",
    fullName: account.full_name,
    email: account.email,
    phone: account.phone,
    defaultAddress: hasAddress
      ? {
          province: account.default_province,
          district: account.default_district,
          ward: account.default_ward,
          addressLine: account.default_address_line,
        }
      : null,
  };
}

export function createAccountService(accountRepository) {
  return {
    async getProfile(accountId) {
      const account = await accountRepository.findCustomerProfileById(accountId);

      if (!account) {
        throw notFoundError();
      }

      return toProfile(account);
    },

    async updateProfile(accountId, changes) {
      try {
        const account = await accountRepository.updateCustomerProfile(accountId, changes);

        if (!account) {
          throw notFoundError();
        }

        return toProfile(account);
      } catch (error) {
        if (error?.code === "23505" && error.constraint === "customers_phone_key") {
          throw new AppError({
            statusCode: 409,
            code: "ACCOUNT_CONFLICT",
            message: "Thông tin tài khoản đã được sử dụng.",
            fields: { phone: "Số điện thoại đã được sử dụng." },
          });
        }

        throw error;
      }
    },

    async changePassword(accountId, { currentPassword, newPassword }) {
      const currentHash = await accountRepository.findCustomerPasswordHash(accountId);

      if (!currentHash) {
        throw notFoundError();
      }

      if (!(await verifyPassword(currentHash, currentPassword))) {
        throw new AppError({
          statusCode: 400,
          code: "CURRENT_PASSWORD_INCORRECT",
          message: "Mật khẩu hiện tại không đúng.",
          fields: { currentPassword: "Mật khẩu hiện tại không đúng." },
        });
      }

      const passwordHash = await hashPassword(newPassword);
      const updated = await accountRepository.updateCustomerPasswordHash(accountId, passwordHash);

      if (!updated) {
        throw notFoundError();
      }
    },
  };
}
