# Buzz review and Relay direction

Reference: [block/buzz](https://github.com/block/buzz), source snapshot `6c35e82bd50f4ad6587554eeb429e7378d474ba7`. Source inspection, not a running system audit.

## What to preserve

Buzz treats agents as visible participants in channels, DMs, and threads. It also contains forums, canvases, searchable messages, activity, agent workflows, git-backed projects, profiles, notifications, moderation, media, huddles, and shared local compute. Several advanced areas are feature-flagged, so the README understates parts of the implementation. The code already includes local model selection/download paths and remote agent deployment, rather than only a vision document.

## What Relay changes

1. Local compute is a primary product journey: pair a GB10, choose a compatible model, set role and company context, review boundaries, then activate only after real verification. Pairing, model download, inference readiness, and agent readiness must have separate states.
2. Cloud and local are explicit routes. Agent execution location and inference location are distinct facts. A locally running process that calls a cloud model must not inherit a private/local badge.
3. Company data has its own tab with collection and document policy, classification before ingestion, preview, and a readable explanation of which agents can use it. Restricted material excludes cloud configuration by default.
4. Projects serve engineering, operations, and business, with tasks, owners, status, deliverables, and discussion. Git repositories are one integration instead of the only organizing concept.
5. Human review is an actual product surface with a concrete draft, destination, allowed audience, and approval scope. Changes to content or audience invalidate approval.

## Security gaps to resolve in a backend

Buzz's ACP permission handler in `crates/buzz-acp/src/acp.rs` selects `allow_once` automatically when available. That is not sufficient for company-wide consequential actions. Its workflow crate explicitly returns `approval_not_supported` for the YAML approval gate, so displaying a gate cannot be treated as proof that workflows enforce one.

The repository has an information-flow design document and an `ifc-core` confidentiality lattice. At the reviewed snapshot, no application imports of that crate were found. This is useful architecture work, but not evidence of end-to-end enforcement. Identity/federation primitives exist; enterprise account lifecycle and document ingestion enforcement still need independent validation.

For Relay, retrieval must authorize before fetching chunks, embeddings, or cached summaries. Derived content inherits its source restrictions. Agents run with scoped credentials; prompts cannot relax permissions. Device registration requires authenticated identity and proof of possession. External actions require server-bound approval over exact content and recipient. Audit records must come from the enforcing service.

## Frontend completion versus parity

This build covers the major collaboration and agent-management surfaces as interactive local UI. It does not claim full Buzz backend or integration parity. Production follow-on includes real-time delivery and unread state, persistence, membership and authorization, media storage, voice transport, search indexing, model management and inference, workflow execution, push notifications, enterprise identity, and integration-specific project sync.
