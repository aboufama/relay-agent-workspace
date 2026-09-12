# Shared backend integration

Imported `orion-hoch/relay-agent-workspace` branch `shoal-local-demo` at `7c0e632`,
retaining Shoal's current frontend, Habitats, security-depth Data canvas, and navigation.

- Chat, threads, messages, runs and approvals use the shared Buzz store and API.
- Deep dive is a per-conversation composer option. Without explicit mentions,
  channel dives use the available agents authorized for that room. DMs retain
  their recipient scope. The compact strip displays recorded runs and descendants.
- Agent creation/editing/deletion persist through the backend; newest agents appear
  beside the creation card. Active agents cannot be deleted while work is running.
- Data imports, classifications and named grants persist. Explicit file grants
  give collection scope only for that file; runtime, clearance and audience rules
  still apply. Cloud retrieval is capped at Internal by the visible access policy.
- Five sea-animal sheets extend the portrait registry with four real activity states.
- Vercel uses the Next API proxy. `SHOAL_BACKEND_URL` and `SHOAL_BACKEND_TOKEN`
  are intentionally unset until the shared backend is hosted. Native Vinext builds
  continue to use D1/R2. No cloud database or runner was replaced during this merge.

Validation: Next production build and release-source lint; local D1/R2 agent
create/edit/delete/order and reload checks; file import/reclassification and named
permission checks; grant revocation and cloud restriction retrieval checks;
responsive portrait/DM/Data checks. QA-created records were removed. Model inference
was not run as part of this integration review.
