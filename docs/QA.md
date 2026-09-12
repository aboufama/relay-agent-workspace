# Frontend release audit — 12 September 2026

Reference reviewed: actual Block Buzz source and channel screenshots at snapshot 6c35e82bd50f4ad6587554eeb429e7378d474ba7. PageHeader was ported, ChatHeader adapted, and original license retained. Visual comparison covers hierarchy, density, message layout, sidebar, menus, and dialogs; this is not a claim of exact pixel or complete feature parity.

## Browser results

- 11 chat scenarios passed: sending with Enter and line breaks with Shift+Enter; channel and DM isolation; new channel/message persistence after reload; saved replies; rich-text search; reactions; matching draft approval; room context; canvas retention; keyboard preference; mobile navigation dismissal.
- 12 multi-action scenarios passed across Agents, Data, Compute, Projects, Workflows, and Forum. See qa/FEATURE_GAUNTLET.md.
- Huddles: room creation, opening, mute/camera UI state, and leaving passed. Voice and video transmission are not connected.
- All 11 pages captured at 1440×960, 1024×768, and 390×844. Desktop/tablet had no document horizontal overflow. Mobile Data overflow was fixed and screenshot-verified.
- Mobile Data import, GB10 pairing, project creation, and discussion dialogs fit and scroll. Agent and workflow forms were covered by functional desktop checks.
- Final functional runs reported no page/console errors.

## Fixed defects

Mobile navigation remained open after selection; Data table escaped the viewport; agent detail cards cleared selection instead of opening; some compute metadata was 8–9px; card chevrons wrapped; empty thread actions cluttered the conversation; Settings connection management was a dead-end toast. These were corrected. Automatic workflow detail opening after creation was removed.

## Scope and remaining integrations

This is an interactive frontend; server messaging, company authentication/authorization, shared data persistence, agent inference, runtime verification/model installation, real voice/video, and workflow execution remain backend integration work. The UI marks disconnected operations and does not execute them. File classification and cloud exclusion are local configuration behavior, not enforceable service security.

Optional WebMCP tools were not verified: document.modelContext was absent in the available Chromium context. No assistive-technology certification, load test, or exhaustive permutation test is claimed. Automated screenshots are QA artifacts, not a deployment thumbnail.

## Final agent screen and dependency pass

The Agents screen was subsequently rebuilt from Buzz identity-card markup (4:5 cards, 96px centered avatars, dashed create card, responsive 1–5 columns, agent teams). Local/cloud setup, editable capabilities, agent defaults, team creation/editing, and custom avatar/state selection remain available. User-supplied sprite files are preserved verbatim.

React packages were updated together to 19.2.8 for [the published server-function fix](https://github.com/advisories/GHSA-wx67-qw84-cm4g). Vinext, Vite, and the RSC plugin were upgraded together with compatible peer versions; Undici is pinned through an override. The final production dependency audit reports no high or critical advisories; one low-severity Windows-only development-server esbuild advisory remains. Frontend/browser verification is separate from this dependency audit.


Final sprite check: all 16 character/state combinations use the correct sheet and CSS quadrant. Agent creation with a selected sprite and team creation/editing were exercised in Chromium. The built production Worker was also served locally; all ten non-chat page destinations loaded without page errors. The monochrome application theme intentionally preserves the user-provided profile art in its original colors.

Profile sprite changes were additionally verified to propagate from Agents into existing chat appearances without resetting user messages.

## 12 September — simplified agents and custom dropdowns

Production-worker browser checks pass for generated names, draft cancellation, create/edit persistence during navigation, local/cloud access defaults and freely editable overrides, dropdown keyboard selection, mobile dialog/popup fit, and all five other dropdown surfaces. Ten feature scenarios cover data import/preview/removal/reclassification, projects/tasks/comments, workflows, forum, and compute configuration; no production browser errors. Lint, TypeScript, and production build pass.

All 16 sprite quadrants visually checked; original images unchanged. Runtime activity-to-sprite updates tested independently through the adapter export. Native visible select elements are absent from the app.
