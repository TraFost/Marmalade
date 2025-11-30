# AI Coding Guidelines for Marmalade

## Overview

Marmalade is a voice-based mental health companion monorepo using pnpm workspaces and Turbo for orchestration. It consists of a React client, Hono server, and shared TypeScript types.

## Architecture

- **Client**: React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui in `client/`, depends on `shared` and `server` workspaces
- **Server**: Hono API in `server/`, with Drizzle ORM + Postgres, better-auth for authentication
- **Shared**: TypeScript types in `shared/`, built with `tsc`
- **DB**: Postgres with Drizzle migrations in `server/drizzle/`
- **Auth**: better-auth with email/password and Google OAuth, sessions inferred as `AuthSession`

## Client Folder Structure

Feature-based at top level, atomic inside each feature.

- `src/app/`: App-level providers, router, layout
- `src/features/{feature}/`: Domain-specific features (auth, journaling, dashboard)
  - `components/`: Atomic design (atoms, molecules, organisms)
  - `hooks/`, `services/`, `types/`, `pages/`
- `src/shared/`: Cross-feature shared code
  - `components/ui/`: shadcn/ui components
  - `components/`: Shared atoms/molecules/organisms
  - `hooks/`, `lib/`, `config/`
- `src/styles/`: Extra global styles
- `src/main.tsx`, `src/App.tsx`, `src/index.css`

## Client Conventions

- **Imports**: Always use `@/` alias, no relative imports like `../../../`
- **UI Components**: Primitives from `@/shared/components/ui`, feature-specific in feature's components
- **Styling**: Tailwind CSS v4, shadcn/ui for components
- **Adding shadcn Components**: `npx shadcn@latest add <component>`, ensure placed in `@/shared/components/ui`
- **Path Aliases**: `@/*` → `./src/*` in tsconfig.json and tsconfig.app.json

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
