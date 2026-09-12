# Relay release verification — 12 September 2026

Actual Block Buzz source was reviewed at snapshot `6c35e82bd50f4ad6587554eeb429e7378d474ba7`, including ChatHeader, channel header/avatar, thread and profile panes, identity cards, Inbox panes and Settings sections. Original Apache-2.0 notices remain. The comparison covers counterpart structure and interaction quality; it does not certify complete Buzz or Slack feature parity.

## Current verified frontend

Independent Astra review captured all 11 destinations at 1440, 1024 and 390 pixels. No document horizontal overflow remained. Mobile profile/thread navigation and agent creation fit. The final review verified the thread mention toolbar focuses the composer and opens the picker.

| Before | After |
| --- | --- |
| DM header used @ and workspace-wide members | Recipient avatar, editable shared identity, profile sidepane, appropriate DM controls |
| Threads blocked/blurred the conversation | Embedded, keyboard-resizable desktop pane; full-width mobile pane; shared mention composer and real agent request path |
| Notes shared one global state | Notes persist separately per channel/DM, with migration of the old canvas to launch-room |
| Workspace search inspected only the current room | Search covers stored conversations and opens the matching room/thread |
| Keyboard mention selection could leave the popup viewport | Active member scrolls into view; toolbar insertion focuses the textarea and updates its caret |
| Agent states and bubbles cycled as a visual preview | Stable member IDs share actual idle/sleep/thinking/stuck state across cards, headers, messages, profiles, mentions and sidebar |
| Gradient too strong; bubble exit incomplete | Softer lower-left glow/grain; 54×30 frosted bubble without a tail; 240ms entrance and 220ms exit |
| New shared avatars inherited flex stretching | Fixed 24×24 sidebar avatars; message/profile sizes remain independent |
| Generic Settings and Inbox cards | Grouped settings with local name/preferences and list/detail Inbox with keyboard selection, search and read controls |
| Crowded Data/Workflows screens | Plain headers, scoped responsive layout, accessible collection state, keyboard form submission and empty-file preview handling |
| Generic server icon | Original Dell artwork only inside the Compute card; larger portrait and subtle cool-gray card tint/grain; original icons retained everywhere else |
| Browser-default progress color | Consistent gray progress styling |
| Many model/setup choices | One Dell card prescribing Holo with NemoClaw, OpenClaw and OpenShell; fixed idempotent setup action with real installation progress |
| Thread retry lost parent context after reload | Retry reconstructs parent plus thread history |
| Failed health polling retained stale connection state | Failed or malformed health responses put disconnected agents into sleep |
| Historical-name lookup could override member IDs | Stable IDs resolve first, including seeded message authors |

Controlled SSE checks against the built production Worker passed: DM avatar; no DM-wide member stack; synchronized thinking during a request; idle after completion; sleep for disconnected cloud; stuck on failure; Retry back to thinking; real request routing from thread composer; no overlay; no browser page errors. The checks verify frontend lifecycle/routing, not an independent model benchmark. Entry/exit animation names and timing were inspected in the production build.

TypeScript, lint, production build and `node --experimental-strip-types scripts/check-compute-setup.mjs` pass. The setup proxy checks cover same-origin requests, server-owned destination/action, bounded public status, credential containment and unavailable/malformed upstream responses.

## Runtime

Holo-3.1-35B-A3B NVFP4 on the Dell returned real authenticated streaming responses through `/api/chat`. The required runtime is **NemoClaw + OpenClaw + OpenShell**, using those existing Holo weights. The earlier Nemotron download was stopped after the user clarified the model; its partial cache is preserved. At this UI release the corrected harness is being configured and is not admitted as ready. The setup endpoint and a separate independent runtime verifier determine full-stack readiness. The Spark is untouched.

## Limits

Messages, identity configuration, notes, data and preferences remain local browser state, not a shared multiuser database. Access labels are configuration, not service-level authorization. Voice/video transport and workflow execution remain disconnected. No load test, assistive-technology certification or complete product parity is claimed.

The reported MetaMask rejection names the browser extension's `chrome-extension://…/inpage.js`. No wallet/MetaMask dependency or call exists in Relay app code or its dependency manifest; fresh isolated-browser runs do not reproduce it.
