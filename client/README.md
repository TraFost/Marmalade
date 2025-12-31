# Marmalade Client

## Overview

Voice-first web client for Marmalade, an agentic emotional companion. The client is responsible for real-time audio capture, ElevenLabs streaming integration, session lifecycle control, incremental UI updates via server-sent events (SSE), and local session persistence for continuity across reloads.

This repository contains **only the frontend client**. All model orchestration, memory, and response synthesis occur on the backend.

---

## Core Responsibilities

- Voice-first interaction (microphone capture + audio playback)
- Realtime streaming via ElevenLabs SDK
- Session creation, resumption, and termination
- Incremental UI updates from SSE phase and progress events
- Local persistence of active session identifiers
- Post-session summaries and PDF exports

---

## Architecture

- **Framework**: React 19
- **Bundler / Dev Server**: Vite
- **Audio Layer**: ElevenLabs Realtime SDK
- **Transport**:

  - HTTP for commands and session actions
  - Server-Sent Events (SSE) for phase and progress updates

- **Persistence**:

  - `localStorage` key: `marmalade:sessionId`

The client is intentionally thin. It does not contain business logic, reasoning, or memory synthesis.

---

## High-Level Data Flow (Single Turn)

1. Client starts or resumes a session.

   - Session ID is created or restored from `localStorage`.

2. User input is captured.

   - Voice: streamed via `getUserMedia` → ElevenLabs.
   - Text: sent directly to backend HTTP endpoints.

3. Backend processes the turn.

   - Coordinates models, memory, and voice synthesis.
   - Emits phase and progress events over SSE.

4. Client renders the response incrementally.

   - Streaming text deltas are buffered and applied to UI.
   - Audio playback is handled via ElevenLabs.

5. Turn finalization.

   - Final event closes the turn lifecycle.
   - UI transitions to idle state.

6. Post-session artifacts.

   - Session summaries and reports are accessible via session pages.
   - Optional PDF export.

---

## Environment Variables

Define variables in `client/.env` or the runtime environment.

Required:

- `VITE_SERVER_URL`

  - Base URL of the Marmalade backend API

- `ELEVENLABS_AGENT_ID`

  - Realtime agent identifier used by ElevenLabs

Optional:

- Additional configuration values are defined in:

  - `src/config/env.config.ts`

---

## Quick Start

From the repository root:

```bash
pnpm -C client install
pnpm -C client dev
```

Then:

- Open the application in a browser
- Grant microphone permissions when prompted

---

## Available Commands

```bash
pnpm -C client install   # install dependencies
pnpm -C client dev       # start development server
pnpm -C client run build # production build
pnpm -C client run preview # preview production build
```

---

## Code Structure

### Session and Streaming

- `src/features/session/hooks/use-elevenlabs.session.ts`

  - Session lifecycle management
  - SSE subscription and teardown
  - Streaming delta buffering

- `src/features/session/services/api.session.ts`

  - Session-related HTTP API calls

### Pages

- `src/features/session/pages/session.page.tsx`

  - Live session UI
  - Voice controls and streaming state

- `src/features/session/pages/post-session.page.tsx`

  - Session summary view
  - Export and reporting utilities

### Shared

- `src/shared/components/`

  - Reusable UI primitives

- `src/shared/lib/api/`

  - Client-side API helpers

### Configuration

- `src/config/env.config.ts`

  - Centralized environment variable parsing and validation

---

## Observability and Debugging

- Use browser console logs for client-side events and errors.
- Inspect the Network tab:

- For audio issues:

  - Confirm `navigator.mediaDevices.getUserMedia()` availability.
  - Check browser permissions and active input device.

---

## Troubleshooting

- **Microphone not working**

  - Verify browser permissions
  - Confirm a valid input device is selected

- **Streaming text out of order**

  - Inspect SSE payload message IDs
  - Review delta buffering logic in session hook

---

## Key Files (Entry Points)

- `src/features/session/hooks/use-elevenlabs.session.ts`
- `src/features/session/pages/session.page.tsx`
- `src/features/session/services/api.session.ts`
- `src/shared/components/`
- `src/config/env.config.ts`
