# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY scripts/ ./scripts/
COPY src/ ./src/
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/meals.sqlite
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# dist/ enthält Server und (per scripts/copy-client.js) das Frontend unter dist/client
COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/

# Datenverzeichnis gehört dem unprivilegierten Benutzer (wichtig bei neuen Volumes)
RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["node", "dist/server/index.js"]
