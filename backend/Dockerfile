FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY migrations ./migrations
COPY seeds ./seeds
COPY src ./src

RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate && if [ \"$RUN_SEED\" = \"true\" ]; then npm run seed; fi && npm start"]
