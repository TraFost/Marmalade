# syntax=docker/dockerfile:1

FROM node:22-slim AS builder

WORKDIR /app

# Enable pnpm via Corepack and prepare the specific version
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY server/package.json server/tsconfig.json ./server/

# Install deps for building
# Skip lifecycle scripts (root postinstall runs turbo and is redundant here)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy sources
COPY shared/src ./shared/src
COPY server/src ./server/src
COPY server/drizzle ./server/drizzle

# Build shared + server
RUN pnpm --filter shared build
RUN pnpm --filter server build


FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy manifests needed for a filtered production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json

# Install production deps for the server (includes workspace linking)
# Skip lifecycle scripts: the root `postinstall` calls `turbo` (a dev tool)
# and the shared + server builds are already produced in the builder stage.
RUN pnpm install --prod --frozen-lockfile --filter server... --ignore-scripts

# Copy build outputs
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/drizzle ./server/drizzle
COPY --from=builder /app/shared/dist ./shared/dist

# Cloud Run provides PORT; default is 8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]