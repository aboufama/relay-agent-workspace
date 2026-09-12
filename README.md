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

Channels, direct-message previews, threads, reactions, search, canvas/files, inbox and draft review, agent creation, local/cloud configuration, GB10 pairing and model planning, classified Data import and collections, projects and tasks, workflows and approvals, forum discussions, huddle previews, activity, and workspace settings.

The Data flow selects Public, Internal, Confidential, or Restricted classification before adding files to a collection. Files remain in the current browser session; restricted configurations exclude cloud routes. Agent and Compute views distinguish example devices, pending verification, and cloud configuration. They do not claim a connected runtime.

## Current boundary

This is a deployed interactive frontend with session-scoped example data. It is not a multi-user communications backend. Chat, channel, canvas, and preference changes are saved in browser localStorage. Data files and feature-page configuration remain session-scoped and clear on reload. No GB10/Spark connection, inference endpoint, model download, team invitation, voice call, or external action is executed. Pairing codes, telemetry, and existing workspace records are clearly identified examples or plans.

Security labels and approval decisions demonstrate product behavior; they are not server-side authorization. Before company use, implement authenticated workspace membership, durable storage, server-enforced per-document and derived-data permissions, encrypted device identity, inference routing, audited human approvals, and tested service integrations. Do not put actual company secrets into a frontend demonstration.

The Sites deployment audience is private to its owner. Optional WebMCP navigation and readback tools use feature detection. No supported WebMCP validation context was available in this build session, so those tools have not been verified in a browser.

See [the Buzz design review](docs/BUZZ_REVIEW.md) for implementation inspiration and the next backend priorities.
