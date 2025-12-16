# syntax=docker/dockerfile:1

FROM node:20-slim AS builder

WORKDIR /app

# Enable pnpm via Corepack
RUN corepack enable

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY server/package.json server/tsconfig.json ./server/

# Install deps for building
RUN pnpm install --frozen-lockfile

# Copy sources
COPY shared/src ./shared/src
COPY server/src ./server/src

# Build shared + server
RUN pnpm --filter shared build
RUN pnpm --filter server build


FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

# Copy manifests needed for a filtered production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json

# Install production deps for the server (includes workspace linking)
RUN pnpm install --prod --frozen-lockfile --filter server...

# Copy build outputs
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Cloud Run provides PORT; default is 8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
