# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund \
  && npm cache clean --force

COPY server/prisma.config.js ./prisma.config.js
COPY server/prisma/ ./prisma/
RUN npx prisma generate

COPY --chown=node:node server/src/ ./src/
COPY --chown=node:node deploy/api-entrypoint.mjs deploy/api-healthcheck.mjs ./deploy/
RUN mkdir -p /app/uploads \
  && chown -R node:node /app/uploads

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node deploy/api-healthcheck.mjs

CMD ["node", "deploy/api-entrypoint.mjs"]
