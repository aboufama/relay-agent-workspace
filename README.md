# Relay

A custom agent-native team workspace UI for the Dell × NVIDIA GB10 hackathon. Built with React, TypeScript, Vinext, Base UI primitives, and custom CSS. Meridian is a fictional example company.

## Run

```sh
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## Included

Channels, direct messages, threads, reactions, search, canvas/files, inbox and draft review, agent creation, local/cloud configuration, GB10 pairing and model planning, classified Data import and collections, projects and tasks, workflows and approvals, forum discussions, huddle previews, activity, and workspace settings.

The Data flow selects Public, Internal, Confidential, or Restricted classification before adding files to a collection. Files remain in the current browser session; restricted configurations exclude cloud routes. Agent and Compute views distinguish example devices, pending verification, and cloud configuration. They do not claim a connected runtime.

## Current boundary

This is a deployed interactive frontend with session-scoped example data. It is not a multi-user communications backend. Chat, channel, canvas, and preference changes are saved in browser localStorage. Agent identities, instructions, homes, and access levels persist in the shared browser member directory. Data files and other feature-page configuration remain session-scoped. The chat backend streams real completions from a configured OpenAI-compatible endpoint; agents can be mentioned or messaged using the same member directory as people. The Dell model service is configured separately. Cloud homes require their own provider configuration. Multi-user delivery, voice calls, and external tool actions are not connected. Pairing codes, telemetry, and existing workspace records are clearly identified examples or plans.

Security labels and approval decisions demonstrate product behavior; they are not server-side authorization. Before company use, implement authenticated workspace membership, durable storage, server-enforced per-document and derived-data permissions, encrypted device identity, inference routing, audited human approvals, and tested service integrations. Do not put actual company secrets into a frontend demonstration.

The Sites deployment audience is private to its owner. Optional WebMCP navigation and readback tools use feature detection. No supported WebMCP validation context was available in this build session, so those tools have not been verified in a browser.

See [the Buzz design review](docs/BUZZ_REVIEW.md) for implementation inspiration and the next backend priorities.

## Inference configuration

Server-only runtime settings: `GB10_CHAT_URL`, `GB10_API_KEY`, `GB10_MODEL`. Local development reads ignored `.dev.vars`; deployed settings live in Sites secrets. Optional cloud settings use `CLOUD_CHAT_URL`, `CLOUD_API_KEY`, `CLOUD_MODEL`, and `CLOUD_HOME_ID`. No credential belongs in client code or Git. The gateway is authenticated and permits only model discovery and chat requests. `GET /api/runtime` reports verified model availability. Requests to disconnected homes return a retryable error.

For visual review, two agent-card thought bubbles rotate randomly; this temporary presentation mode does not simulate model responses or change runtime activity.
