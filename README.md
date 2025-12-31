# Marmalade

A voice first mental health companion that maintains continuity over time and provides supportive, safety aware guidance.

This repository is structured for hackathon use. It prioritizes fast setup, deterministic behavior, and clear extension points that can be demonstrated and evaluated within minutes.

---

## How Marmalade Works

Marmalade demonstrates a complete voice based mental health interaction.

A user speaks.
The system performs safety checks.
Agent orchestration produces a response.
A structured summary is persisted.

The demo tells a small, complete story that judges can understand quickly.

The value lies in continuity, safety enforcement on the server, and a modular agent architecture that can be extended during the event.

---

## Repository Structure

client/
React application built with Vite. Handles voice UI, session lifecycle, onboarding, and realtime feedback.

server/
Hono based API responsible for agent orchestration, deterministic safety rules, and persistence using Drizzle and Postgres.

infra/
Pulumi stacks for cloud deployment. GCP focused by default but replaceable.

shared/
Shared TypeScript types and utilities used by both client and server.

docs/
Architecture diagrams and conceptual documentation.

---

## Quick Demo Flow

Install dependencies at the repository root.

pnpm install

Start a Postgres instance locally or via infra.

Start the server.

pnpm -C server dev

Start the client.

pnpm -C client dev

Trigger a voice turn using either an ElevenLabs webhook or a recorded audio POST to the hooks endpoint.

Observe server logs, client UI updates, and persisted conversation data in the database.

This entire flow is designed to complete in under five minutes.

---

## Development Commands

Prerequisites include Node.js LTS 18 or higher, pnpm, and Postgres. Docker is optional.

Root install.

pnpm install

Client development server.

pnpm -C client dev

Server development server.

pnpm -C server dev

Shared package watch build.

pnpm -C shared dev

Infrastructure build and deploy.

pnpm -C infra build
pnpm -C infra up

---

## Database Operations

Generate Drizzle migrations.

pnpm -C server run dev:db:generate

Apply migrations.

pnpm -C server run dev:db:migrate

Drop development database.

pnpm -C server run dev:db:drop

---

## Build and Production

Server build and run.

pnpm -C server run build
pnpm -C server run prod

Client build.

pnpm -C client run build

---

## Environment Configuration

The server loads environment variables from .env.development or .env.production based on NODE_ENV.

Required variables include.

DATABASE_URL for Postgres connectivity.
PORT for server binding with default 8080.
BASE_URL and FRONTEND_URL for CORS and webhook callbacks.
ELEVENLABS_WEBHOOK_SECRET for webhook signature validation.
GOOGLE_CLOUD_PROJECT_ID and VERTEX variables for Vertex AI models.
JWT_SECRET, JWT_PUBLIC_KEY, and BETTER_AUTH_SECRET_KEY for authentication.

The complete validated schema and defaults are defined in server/src/configs/env.config.ts.

---

## Key Extension Points

Conversation lifecycle and orchestration logic lives in server/src/services/conversation.service.ts.

Streaming and webhook entrypoints are implemented in server/src/routes/hooks.route.ts.

Agent behavior, restrictions, and safety boundaries are defined in server/src/services and documented in docs.

Database access is isolated in server/src/repositories using Drizzle.

Client feature entrypoints are under client/src/features.

Shared types reside in shared/src/types and must remain backward compatible.

---

## Testing and Debugging

Server logs use console output and pino. Agent specific and ElevenLabs tagged logs are the fastest way to trace execution.

Webhook flows can be tested locally using ngrok to expose the development server.

Environment validation failures are reported at startup with explicit missing keys.

---

## Architecture Overview

### Marmalade end to end flow

<img src="./docs/marmalade%20end-to-end%20flow.png" alt="Marmalade end-to-end flow" width="700"/>

High level system flow from client to server, agent orchestration, persistence, and reporting.

### Marmalade server AI flow

<img src="./docs/marmalade%20server%20ai%20flow.png" alt="Marmalade server AI flow" width="700"/>

Server side orchestration showing Mini and Counselor agents and their execution order.

### Marmalade agent restriction

<img src="./docs/marmalade%20agent%20restriction.png" alt="Marmalade agent restriction" width="700"/>

Deterministic safety boundaries enforced outside of model prompting.

### Report flow

<img src="./docs/report%20flow.png" alt="Report flow" width="700"/>

POST /reports/session: authenticate, validate finished session, gather recent turns and session state, generate a strict JSON SOAP-style report via Vertex (`SessionReportClient`), validate schema, return `{ sessionId, report, meta }`.

---

## License

See LICENSE.
