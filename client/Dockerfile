FROM node:22-slim AS builder
WORKDIR /app

RUN npm i -g corepack && corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY server/package.json server/tsconfig.json ./server/
COPY server/src ./server/src
COPY client/package.json client/tsconfig.json ./client/

RUN pnpm install --frozen-lockfile --ignore-scripts

RUN pnpm --filter shared run build

COPY client/ ./client/
RUN pnpm --filter client run build

FROM nginx:stable-alpine AS runtime
COPY --from=builder /app/client/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
