# Shoal

An agent-native team workspace for the Dell × NVIDIA GB10 hackathon. Built with React, TypeScript, Next.js/Vinext, Base UI primitives and custom CSS, using Block Buzz's interface structure as a reference.

## Run

```sh
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## Workspace

Channels, DMs, threads, reactions, workspace search, room-specific notes, Inbox, Habitats for compute and editable agents, classified Data collections, huddles and settings. People and agents share the member directory, profile controls and mention composer. Agent avatars reflect real runtime activity: idle, sleeping, thinking or stuck. The thinking bubble enters and exits with that activity.

Habitats offers one fixed Holo setup with NemoClaw, OpenClaw and OpenShell. The Dell illustration appears only inside its card. Setup is idempotent and its status comes from the connected Dell.

## Verified inference

The configured Dell serves **Hcompany/Holo-3.1-35B-A3B-NVFP4** through:

`Shoal → authenticated gateway → OpenClaw in OpenShell → inference.local → Holo vLLM`

NemoClaw manages the sandbox and inference configuration. An independent verifier correlated a unique correct response with OpenClaw, OpenShell and Holo logs. Real DM context recall and channel @agent responses also passed through the published app. See [verification](docs/HOLO_RUNTIME_VERIFICATION.md).

Server-only settings are `GB10_CHAT_URL`, `GB10_API_KEY` and `GB10_MODEL=openclaw/default`. That model value targets the OpenClaw agent; the underlying model remains Holo. Local development reads ignored `.dev.vars`; the original Sites deployment uses its environment settings; Vercel uses server environment variables configured by the backend workstation. Optional cloud homes require `CLOUD_CHAT_URL`, `CLOUD_API_KEY`, `CLOUD_MODEL` and `CLOUD_HOME_ID`. Keep credentials out of client code and Git.

`GET /api/runtime` checks actual runtime health. `GET/POST /api/compute/setup` reads or starts the fixed setup. The public-facing gateway exposes only authenticated setup status/start, model discovery, health and chat. OpenClaw administration remains private.

## Current limits

Workspace messages, identities, notes and preferences persist in browser localStorage; this is not shared multiuser storage. Data and feature-page records remain local browser state. Access labels and approvals are configuration, not service-level authorization. Voice/video transport and workflow execution are not connected. The original Sites deployment remains owner-private. The Vercel frontend preview is public and does not contain backend credentials.

[UI verification](docs/QA.md) records the independent screen review and its limits. [Buzz review](docs/BUZZ_REVIEW.md) records the reference study. Third-party notices preserve the original licenses.

## Vercel

Use the existing repository with the Next.js preset; `vercel.json` sets `npm run build:vercel`. The original Sites/Vinext build remains available as `npm run build`. `npm run dev:vercel` starts the Next.js preview. Vercel environment bindings are server-only and handled by the existing route contracts. Agent backend configuration is owned by the parallel backend workstation.

The frontend includes Habitats (compute and agents together), draggable security depths. Deep Dive code and generated assets are retained for later chat integration; it is not an active navigation tab. Workspace browser storage remains local; it is not shared team persistence. The Vercel anonymous deployment is temporary and must be claimed by an account for continued hosting. Never commit `.vercel/anonymous.json` or its claim URL.
