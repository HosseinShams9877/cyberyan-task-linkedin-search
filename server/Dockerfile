# =============================================================================
# LinkedIn Dataset Search API - production image
#
# Build (SQLite, self-contained - the image carries prisma/dev.db if you copy it):
#   docker build -t linkedin-search-api ./server
#
# Build for Postgres/Neon (the provider is baked in at generate time):
#   docker build -t linkedin-search-api \
#     --build-arg DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" ./server
#
# Run:
#   docker run -p 5000:5000 -e DATABASE_URL="postgresql://..." linkedin-search-api
#
# Vercel does NOT use this file - it builds server/api/index.ts as a function.
# =============================================================================

# --- Stage 1: install dependencies and compile TypeScript --------------------
FROM node:22-slim AS build

# openssl is what Prisma's query engine links against.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Only decides which Prisma engine/provider gets generated into the image.
# Defaults to SQLite so `docker build ./server` works with no arguments.
ARG DATABASE_URL="file:./dev.db"
ENV DATABASE_URL=${DATABASE_URL}

# Dependencies first, so a source-only change reuses this layer.
# postinstall needs scripts/ and prisma/ to generate the client.
COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY api ./api

# generate + tsc + copy the generated client into dist/
RUN npm run build

# --- Stage 2: runtime -------------------------------------------------------
FROM node:22-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Production dependencies only. --ignore-scripts skips postinstall: the client is
# already generated and copied in below, and the Prisma CLI is a devDependency.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma/schema.prisma /app/prisma/schema.generated.prisma ./prisma/

# Drop privileges - the base image ships an unprivileged `node` user.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
