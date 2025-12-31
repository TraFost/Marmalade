# Server Implementation

## Overview

**Purpose**
Accept voice input, orchestrate model-based agents, apply deterministic safety checks, and persist conversation state and audit data.

**Architecture**

- Hono HTTP server handles inbound webhooks and client requests
- Conversation and agent orchestration live in service layers
- Persistent state stored in PostgreSQL via Drizzle ORM
- Google Vertex AI powers Mini and Counselor agents
- ElevenLabs handles real-time audio ingress and egress

**Key Entrypoints**

- Main webhook + streaming route: `server/src/routes/hooks.route.ts`
- Conversation lifecycle: `server/src/services/conversation.service.ts`

---

## Quick Start

1. Copy environment template

   ```bash
   cp .env.example .env.development
   ```

2. Populate required environment variables
3. Start PostgreSQL
4. From repository root:

   ```bash
   pnpm install
   pnpm -C server run dev
   ```

5. Trigger a voice turn via the client UI or POST to the hooks endpoint

---

## Environment Variables

- Full validation logic: `server/src/configs/env.config.ts`
- Key variables:

  - `DATABASE_URL`
  - `ELEVENLABS_WEBHOOK_SECRET`
  - `GOOGLE_CLOUD_PROJECT_ID`
  - `VERTEX_MINI_MODEL`
  - `VERTEX_COUNSELOR_MODEL`
  - `VERTEX_EMBEDDING_MODEL`
  - `BASE_URL`
  - `FRONTEND_URL`
  - `PORT`
  - `JWT_SECRET`
  - `JWT_PUBLIC_KEY`
  - `BETTER_AUTH_SECRET_KEY`

---

## Commands

- Install dependencies

  ```bash
  pnpm install
  ```

- Run development server

  ```bash
  pnpm -C server run dev
  ```

- Generate database schema

  ```bash
  pnpm -C server run dev:db:generate
  ```

- Run migrations

  ```bash
  pnpm -C server run dev:db:migrate
  ```

- Drop database

  ```bash
  pnpm -C server run dev:db:drop
  ```

- Build

  ```bash
  pnpm -C server run build
  ```

- Production build & run

  ```bash
  pnpm -C server run prod:build
  pnpm -C server run prod
  ```

---

## Docker

- Build image

  ```bash
  docker build -t marmalade-server .
  ```

- Run container with required environment variables

---

## Code Map

### 1. HTTP & Routes

- `server/src/routes/hooks.route.ts`
  Handles ElevenLabs webhooks and audio streaming
- `server/src/routes/messages.route.ts`
  Exposes message APIs and SSE endpoints

### 2. Core Services

- `conversation.service.ts`
  Orchestrates a full conversation turn:

  - input collection
  - agent invocation
  - safety checks
  - response shaping
  - persistence
  - event emission

- `session.service.ts`
  Manages session lifecycle and session-scoped state

### 3. AI Clients & Agents

- Vertex model clients:

  - `mini-brain.client.ts`
  - `counselor-brain.client.ts`

- Agents (`server/src/libs/ai/agents/`):

  - rule evaluation
  - safety interventions
  - language shaping
  - memory curation

### 4. Persistence

- `drizzle/`
  Database schema and migrations
- Repositories (`server/src/repositories/`):

  - messages
  - session state
  - embeddings
  - knowledge base documents
  - risk and audit logs

### 5. Middleware & Helpers

- Validation: `zod.middleware.ts`
- Authentication: `auth.middleware.ts`
- ElevenLabs webhook verification: `elevenlabs.helper.ts`

### 6. Events & Streaming

- Internal event bus: `event-bus.ts`
- SSE endpoint:

  ```text
  /messages/events?sessionId=<id>
  ```

  Streams lifecycle phases and progress updates

---

## Safety & Auditing

- Safety rules enforced deterministically on the server
- All safety decisions and risk signals are persisted
- Intervention and language-shaping agents can modify or block outputs before delivery

---

## Observability & Debugging

- Structured logging via Pino with user and session identifiers
- Centralized error handling: `error.middleware.ts`
- Startup fails fast with clear environment validation errors

---

## Testing

- Unit tests required for:

  - safety logic
  - agent behavior

- Integration tests should:

  - mock external AI clients
  - validate full conversation turn flow

- Test runner and CI are not included by default

---

## Troubleshooting

- Check environment validation in `env.config.ts`
- Verify ElevenLabs webhook setup and secret if webhooks do not arrive
- For migration issues:

  ```bash
  pnpm -C server run dev:db:generate
  pnpm -C server run dev:db:migrate
  ```

---

## Key Files

- `server/src/dev.ts`
- `server/src/server.ts`
- `server/src/services/conversation.service.ts`
- `server/src/routes/hooks.route.ts`
- `server/src/configs/env.config.ts`
- `drizzle/`
- `server/src/libs/ai/agents/`
- `server/src/repositories/`

---
