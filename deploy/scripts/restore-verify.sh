#!/bin/sh
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: $0 /absolute/path/to/steplab-backup.dump" >&2
  exit 64
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
compose_file="$repository_root/compose.yaml"
env_file=${DEPLOY_ENV_FILE:-"$repository_root/deploy/.env"}
backup_file=$(CDPATH= cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1")
trial_database="steplab_restore_$(date -u +%Y%m%d%H%M%S)_$$"

if [ ! -f "$env_file" ]; then
  echo "Deployment environment file is missing: $env_file" >&2
  exit 66
fi

cleanup() {
  docker compose --env-file "$env_file" -f "$compose_file" exec -T db \
    sh -c 'dropdb --if-exists --force --username="$POSTGRES_USER" "$1"' sh "$trial_database" \
    >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker compose --env-file "$env_file" -f "$compose_file" exec -T db \
  sh -c 'createdb --username="$POSTGRES_USER" "$1"' sh "$trial_database"

docker compose --env-file "$env_file" -f "$compose_file" exec -T db \
  sh -c 'pg_restore --exit-on-error --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$1"' sh "$trial_database" \
  < "$backup_file"

table_count=$(docker compose --env-file "$env_file" -f "$compose_file" exec -T db \
  sh -c 'psql --username="$POSTGRES_USER" --dbname="$1" --tuples-only --no-align --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = '\''public'\'';"' sh "$trial_database")

echo "Trial restore succeeded in isolated database; public table count: $table_count"
cleanup
trap - EXIT INT TERM
