import { pool } from "./pool.js";

export function createAuthRepository(databasePool = pool) {
  return {
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
