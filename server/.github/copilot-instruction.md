## Marmalade Backend Instructions

Use these notes when touching the Hono API (server workspace) so we continue to ship predictable routes, schemas, and services.

### Architecture Recap

- **Framework:** Hono running on the edge runtime entry (`src/server.ts`) with `dev.ts` for local hot reload.
- **Auth:** better-auth handles sessions; the auth config lives under `src/configs/auth.config.ts` and routes mount at `/api/auth/*` by default.
- **DB:** Drizzle ORM + Postgres. Schemas sit in `src/libs/db/schemas`, exported via `index.ts`; migrations are generated into `server/drizzle/*`.
- **Services & Repos:** Keep business logic in `src/services`, data access in `src/repositories`. Routes should stay thin and only orchestrate validation + service calls.
- **Screenings Wizard:** The five-step onboarding flow now lives under `screenings.schema.ts`, `screening.repository.ts`, `screening.service.ts`, `/routes/screenings.route.ts`, and `/routes/validators/screenings.validator.ts`. Enums/constants for gender/age/etc. are defined next to the schema and re-used everywhere. Mirror that pattern whenever you add multi-step flows (pure service logic + thin HTTP handlers + shared validators).

### Standard Workflow

1. Update or add schemas in `src/libs/db/schemas/*.schema.ts`. Surface new exports in `schemas/index.ts`.
2. Run `pnpm db:generate` inside `server/` to emit a migration, then `pnpm db:migrate` to apply it locally. Never hand-edit the SQL unless reviewing generated output.
3. Define repositories (SQL queries) under `src/repositories`, then wrap them with service methods that enforce domain rules.
4. Register new HTTP handlers in `src/routes`, wire them to services, and mount the router inside `src/server.ts` under the `/api` prefix.

### Request Handling

- Input validation happens through the Zod middleware (`src/libs/middlewares/zod.middleware.ts`). Create validators (e.g., in `/routes/validators/*`) and pass them into `zValidator` so every route returns consistent error payloads without manual parsing.
- Auth-protected routes must use `auth.middleware.ts` before hitting the handler so session info is available as `c.get("authSession")`.
- Global error handling is centralized in `error.middleware.ts`. Do not try/catch inside every route—bubble up and let the middleware format the response.
- Throw domain errors via the shared `AppError` (`src/libs/helper/error.helper.ts`) so status codes + error codes stay consistent, and let `handleError` shape the JSON payload.

### Coding Conventions

- Stick to absolute imports via the configured TS paths (no `../../..`).
- Keep each file focused (one schema per file, one route per domain slice, etc.). Shared helpers belong in `src/libs`.
- Log via the pino instance configured in `server.ts` when you need request-level traces; avoid `console.log`.
- Return the shared `ApiResponse` shape from `shared` when responding to the client, especially for success envelopes.

### Deployment Notes

- Environment variables live in `.env.development` for local work and are typed in `src/configs/env.config.ts`. Update that file whenever new variables are introduced.
- Before merging, run `pnpm lint:server` / `pnpm type-check:server` (or the equivalent turbo tasks) so the backend stays green with the monorepo pipelines.
