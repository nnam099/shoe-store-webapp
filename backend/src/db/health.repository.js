import { pool } from "./pool.js";

export function createHealthRepository(databasePool = pool) {
  return {
    async checkDatabase() {
      await databasePool.query("SELECT 1");
      const result = await databasePool.query(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = $1) AS available",
        ["pg_trgm"],
      );

      return {
        pgTrgmAvailable: result.rows[0]?.available === true,
      };
    },
  };
}
