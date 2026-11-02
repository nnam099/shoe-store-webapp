#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/outside/repository" >&2
  exit 64
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
compose_file="$repository_root/compose.yaml"
env_file=${DEPLOY_ENV_FILE:-"$repository_root/deploy/.env"}

if [ ! -f "$env_file" ]; then
  echo "Deployment environment file is missing: $env_file" >&2
  exit 66
fi

mkdir -p -- "$1"
output_dir=$(CDPATH= cd -- "$1" && pwd)
case "$output_dir" in
  "$repository_root"|"$repository_root"/*)
    echo "Backup directory must be outside the Git repository." >&2
    exit 65
    ;;
esac

umask 077
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$output_dir/steplab-$timestamp.dump"
partial_file="$backup_file.partial"
list_file="$backup_file.list"

docker compose --env-file "$env_file" -f "$compose_file" exec -T db \
  sh -c 'pg_dump --format=custom --compress=6 --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  > "$partial_file"

if [ ! -s "$partial_file" ]; then
  echo "Backup output is empty; leaving the partial file for diagnosis." >&2
  exit 1
fi

docker compose --env-file "$env_file" -f "$compose_file" exec -T db \
  pg_restore --list < "$partial_file" > "$list_file"

mv -- "$partial_file" "$backup_file"
echo "Backup created and catalog-verified: $backup_file"
echo "Catalog: $list_file"
