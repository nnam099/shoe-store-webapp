import { pool } from "./pool.js";

export function createAuthRepository(databasePool = pool) {
  return {
    async createCustomer({ fullName, email, phone, passwordHash }) {
      const result = await databasePool.query(
        `INSERT INTO customers (full_name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id::text, full_name, email, phone`,
        [fullName, email, phone, passwordHash],
      );
      return result.rows[0];
    },

    async findCustomerCredentialsByIdentifier(identifier) {
      const result = await databasePool.query(
        `SELECT id::text, full_name, email, phone, password_hash
         FROM customers
         WHERE email = $1 OR phone = $1`,
        [identifier],
      );
      return result.rows[0] ?? null;
    },

    async findActiveAccountById({ accountId, role }) {
      if (role === "customer") {
        const result = await databasePool.query(
          `SELECT id::text, full_name, email, phone
           FROM customers
           WHERE id = $1`,
          [accountId],
        );
        return result.rows[0] ?? null;
      }

      if (role === "admin") {
        const result = await databasePool.query(
          `SELECT id::text, full_name, email
           FROM admin_accounts
           WHERE id = $1 AND deleted_at IS NULL`,
          [accountId],
        );
        return result.rows[0] ?? null;
      }

      return null;
    },
  };
}
