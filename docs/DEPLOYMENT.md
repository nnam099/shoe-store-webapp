# STEP/LAB Docker deployment

This Docker setup is based on the reviewed B1+B2 commit. It does not contain B3/VNPAY code or migrations.

## Release source safety

The Docker build copies `client`, `server/src`, and `server/prisma` from its current build context. While B3 remains unapproved, never build or run the migration service from a dirty worktree containing B3 files. Build Hosting releases only from a clean B1+B2-plus-Docker commit/worktree. Otherwise the API image and migration image would include unapproved B3 code and migrations.

## Services and isolation

- `web`: builds the Vite app, serves the SPA with Caddy, and proxies `/api/*` to `api`.
- `api`: runs Express/Prisma as the unprivileged `node` user.
- `db`: PostgreSQL 16 on an internal Docker network. It has no host port mapping.
- `migrate`: an opt-in tool profile that only runs `prisma migrate deploy`.
- Named volumes persist PostgreSQL, managed uploads, and Caddy state.
- Docker JSON logs rotate at 10 MB with three files per container.

The default Compose project is `steplab-local`. Production must set a different project name, so it cannot reuse local containers, networks, or volumes accidentally.

## Local setup

1. Start Docker Desktop and confirm that Linux containers are enabled.
2. Copy `deploy/local.env.example` to `deploy/.env`.
3. Replace every `REPLACE_WITH_*` value locally. Use different random values of at least 32 characters for each JWT/OTP/security secret. Do not commit or share `deploy/.env`.
4. Keep SMTP and Google values blank when only checking Docker health, routing, and migrations. Those integrations fail closed until real configuration is supplied.
5. Build images:

   ```powershell
   docker compose --env-file deploy/.env build
   ```

6. Start only the isolated database and wait for it to become healthy:

   ```powershell
   docker compose --env-file deploy/.env up -d db
   docker compose --env-file deploy/.env ps
   ```

7. Review migration status, then deploy the committed B1+B2 migrations. Never use `migrate reset`, `db push`, or seed commands here.

   ```powershell
   docker compose --env-file deploy/.env --profile tools run --rm migrate npx prisma migrate status
   docker compose --env-file deploy/.env --profile tools run --rm migrate
   ```

8. Start the application:

   ```powershell
   docker compose --env-file deploy/.env up -d api web
   docker compose --env-file deploy/.env ps
   ```

9. Browse `http://localhost:8080`. Safe smoke checks:

   - `http://localhost:8080/` serves the SPA.
   - Refreshing `http://localhost:8080/products` still serves the SPA.
   - `http://localhost:8080/api/health` returns `{"status":"ok"}`.
   - The API container healthcheck combines that HTTP check with a database `SELECT 1`; Compose reports it healthy only when both pass.
   - `/api/uploads/...` is proxied to the persistent API upload directory.

No seed or admin bootstrap runs automatically. A fresh database is intentionally empty.

## Production configuration

Copy `deploy/production.env.example` to `deploy/.env` on the server and replace all placeholders. Important rules:

- `DATABASE_URL` must use host `db`, the production database name, and a URL-encoded password.
- Production data must never use or copy `shoe_store_dev`.
- Set `SITE_ADDRESS` and `APP_BASE_URL` to the exact HTTPS origin. Caddy keeps browser API traffic same-origin.
- Add that same HTTPS origin to Google OAuth Authorized JavaScript origins.
- `VITE_GOOGLE_CLIENT_ID` is compiled into the frontend image. Rebuild `web` after changing it. `GOOGLE_CLIENT_ID` must match it.
- Keep Gmail App Password, JWT secrets, OTP secrets, database credentials, and all other secrets only in `deploy/.env` or a later approved secret manager.
- Only ports 80 and 443 are published. PostgreSQL and Express are not exposed directly.

Caddy obtains and renews HTTPS certificates automatically after the domain points to the server and inbound ports 80/443 are open.

## Safe migration and update workflow

Before every production migration:

1. Create and verify an off-repository database backup.
2. Review the exact migration files in the release.
3. Run `prisma migrate status` through the `migrate` service.
4. Run `prisma migrate deploy` once.
5. Start/update `api` and `web`, then verify readiness and logs.

Example update commands:

```sh
docker compose --env-file deploy/.env build
docker compose --env-file deploy/.env up -d db
docker compose --env-file deploy/.env --profile tools run --rm migrate npx prisma migrate status
docker compose --env-file deploy/.env --profile tools run --rm migrate
docker compose --env-file deploy/.env up -d api web
docker compose --env-file deploy/.env ps
```

Never run a reset, destructive reseed, or `db push` against production. Application rollback means selecting a previously tested image/revision. Database rollback requires a reviewed restore decision; do not improvise reverse SQL.

## Backup and restore verification

Backups must be written outside the Git repository. On a Linux host:

```sh
chmod 700 deploy/scripts/backup-postgres.sh deploy/scripts/restore-verify.sh
./deploy/scripts/backup-postgres.sh /var/backups/steplab
./deploy/scripts/restore-verify.sh /var/backups/steplab/steplab-YYYYMMDDTHHMMSSZ.dump
```

The backup script creates a PostgreSQL custom-format dump and validates its catalog. The restore script restores into a new isolated temporary database, reports only the public table count, and drops that temporary database. It never targets the live database.

Back up the `uploads_data` volume separately together with checksums. Store database and upload backups off the VPS, encrypt them, retain at least seven daily and four weekly copies, and perform periodic trial restores.

For a real recovery, restore into a new empty database/volume first, validate migrations and application smoke checks, then switch the application during an approved maintenance window. The provided script intentionally has no mode that overwrites the live database.

## Operations

View status and sanitized logs without printing environment variables:

```sh
docker compose --env-file deploy/.env ps
docker compose --env-file deploy/.env logs --tail=200 web api db
```

Stop application containers without deleting data:

```sh
docker compose --env-file deploy/.env stop web api
```

Do not use `docker compose down --volumes`; it deletes persistent database/upload volumes.
