# AI Coding Guidelines for Marmalade

## Overview

Marmalade is a voice-based mental health companion monorepo using pnpm workspaces and Turbo for orchestration. It consists of a React client, Hono server, and shared TypeScript types.

## Architecture

- **Client**: React 19 + Vite in `client/`, depends on `shared` and `server` workspaces
- **Server**: Hono API in `server/`, with Drizzle ORM + Postgres, better-auth for authentication
- **Shared**: TypeScript types in `shared/`, built with `tsc`
- **DB**: Postgres with Drizzle migrations in `server/drizzle/`
- **Auth**: better-auth with email/password and Google OAuth, sessions inferred as `AuthSession`

## Key Workflows

- **Development**: `pnpm dev` (runs all), `pnpm dev:client`, `pnpm dev:server`
- **Build**: `turbo build` (caches with inputs/outputs defined in `turbo.json`)
- **DB**: `cd server && pnpm db:generate` (schema changes), `pnpm db:migrate` (apply), `pnpm db:drop` (reset)
- **Lint/Type-check**: `turbo lint`, `turbo type-check`

## Conventions

- **Schemas**: Define in `server/src/libs/db/schemas/*.schema.ts`, export from `index.ts`, use `drizzle-zod` for insert/select/update types
- **Routes**: Hono routes in `server/src/routes/`, e.g., `auth.route.ts`
- **Services/Repositories**: Business logic in `services/`, data access in `repositories/`
- **Middlewares**: Custom in `server/src/libs/middlewares/`, applied in `server.ts`
- **Config**: Env in `server/src/configs/env.config.ts`, auth in `auth.config.ts`
- **Logging**: Pino via `hono-pino`, configured in `server.ts`
- **Error Handling**: Custom middleware catches errors, returns JSON responses
- **Types**: Shared in `shared/src/types/`, imported as `import type { ApiResponse } from "shared"`

## Examples

- Add new route: Create `server/src/routes/new.route.ts`, import and route in `server.ts` under `/api`
- DB query: Use `db` from `server/src/libs/db/db.lib.ts`, e.g., `await db.select().from(users)`
- Auth check: Use `auth.middleware.ts` for protected routes
- Client API call: Fetch from `${import.meta.env.VITE_SERVER_URL}/api/...`, type with `ApiResponse`

## Integration Points

- Auth routes handled by better-auth at `/api/auth/*`
- CORS configured in `cors.config.ts`
- CSRF, secure headers, timing middlewares applied globally
