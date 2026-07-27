# syntax=docker/dockerfile:1

# ── deps ─────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY apps/api/package.json ./apps/api/package.json
COPY package.json package-lock.json* ./
RUN npm install --workspace apps/api --include-workspace-root --no-audit --no-fund

# ── build ────────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY apps/api ./apps/api
RUN npx --workspace apps/api prisma generate --schema apps/api/prisma/schema.prisma \
  && npm run build --workspace apps/api

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 --create-home api

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

RUN mkdir -p /app/apps/api/uploads && chown -R api:api /app/apps/api

WORKDIR /app/apps/api
USER api
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1

CMD ["node", "dist/server.js"]
