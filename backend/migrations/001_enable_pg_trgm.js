export function up(pgm) {
  pgm.sql("CREATE EXTENSION IF NOT EXISTS pg_trgm");
}

export function down(pgm) {
  pgm.sql("DROP EXTENSION IF EXISTS pg_trgm");
}
