# Shared Types & Utilities

The `shared/` package provides canonical TypeScript types and small helpers consumed by both `client/` and `server/`.

## Contents

- `shared/src/types/` — message/session/report/response types used throughout the app
- `shared/src/index.ts` — package entry point (exports types)

## Usage

- Import shared types in server or client code:
  ```ts
  import type { ConversationReport } from "shared";
  ```

## Build / Develop

This package is part of the pnpm workspace. Build steps are handled via the root `pnpm install` and `pnpm dev` workflows.

If you change the types and need them reflected in the client/server builds, run the relevant dev servers or `turbo build` if working on production artifacts.
