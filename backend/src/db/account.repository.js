import { pool } from "./pool.js";

const PROFILE_COLUMNS = `id::text, full_name, email, phone,
  default_province, default_district, default_ward, default_address_line`;

export function createAccountRepository(databasePool = pool) {
  return {
    async findCustomerProfileById(accountId) {
      const result = await databasePool.query(
        `SELECT ${PROFILE_COLUMNS}
         FROM customers
         WHERE id = $1`,
        [accountId],
      );
      return result.rows[0] ?? null;
    },

    async updateCustomerProfile(accountId, changes) {
      const addressProvided = Object.hasOwn(changes, "defaultAddress");
      const address = changes.defaultAddress;
      const result = await databasePool.query(
        `UPDATE customers
         SET full_name = COALESCE($2, full_name),
             phone = COALESCE($3, phone),
             default_province = CASE WHEN $4 THEN $5 ELSE default_province END,
             default_district = CASE WHEN $4 THEN $6 ELSE default_district END,
             default_ward = CASE WHEN $4 THEN $7 ELSE default_ward END,
             default_address_line = CASE WHEN $4 THEN $8 ELSE default_address_line END,
             updated_at = now()
         WHERE id = $1
         RETURNING ${PROFILE_COLUMNS}`,
        [
          accountId,
          changes.fullName ?? null,
          changes.phone ?? null,
          addressProvided,
          address?.province ?? null,
          address?.district ?? null,
          address?.ward ?? null,
          address?.addressLine ?? null,
        ],
      );
      return result.rows[0] ?? null;
    },

    async findCustomerPasswordHash(accountId) {
      const result = await databasePool.query(
        "SELECT password_hash FROM customers WHERE id = $1",
        [accountId],
      );
      return result.rows[0]?.password_hash ?? null;
    },

    async updateCustomerPasswordHash(accountId, passwordHash) {
      const result = await databasePool.query(
        `UPDATE customers
         SET password_hash = $2, updated_at = now()
         WHERE id = $1`,
        [accountId, passwordHash],
      );
      return result.rowCount === 1;
    },
  };
}
