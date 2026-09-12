# Feature-module browser QA

Target: http://localhost:3000, current relay-workspace checkout. Chromium headless, 1440 × 1000. Real browser interactions against running app, not source-only checks.

## Result

12 multi-action scenarios pass. No browser page errors or console errors in final run.

- Agents: create local agent; create cloud agent with custom provider; confidential/restricted collection checkboxes disabled on cloud; cloud filter excludes local agent; open detail; enter capability editor; save configuration.
- Data: import a real in-memory text file with Restricted classification; verify cloud agent disabled; preview actual text; return through chat and retain file; search and remove immediately; create collection; switch grid; change sample classification to Restricted and verify cloud disabled.
- Projects: create task; set Done; add comment; create project and task; list view; search; change status to In review.
- Workflows: create workflow; enable toggle; open approval; approve draft.
- Forum: create topic; post reply; appreciate; toggle following; search topic.
- Compute: save GB10 pairing configuration; save cloud provider configuration; create Holo installation plan.

## Confirmed defect fixed

Agent card onClick cleared selected agent instead of selecting it, making every detail/capability screen unreachable. Fresh-file patch in AgentsView.tsx setsSelected(agent) only in card handler. Root integrated it; final browser run confirms detail and capability controls open and save.

## Lean interaction adjustment

WorkflowsView.tsx removes automatic opening of workflow detail after creation. Root can integrate the single removed setSelected(workflow) statement inside createWorkflow. Existing create/toggle/approval flow passes; details remain accessible through their normal button.

## Evidence

Harness: /tmp/relay-gauntlet.cjs
Final raw results: /tmp/relay-gauntlet-results.log
Screenshots: /tmp/qa-agents.png, /tmp/qa-data.png, /tmp/qa-projects.png, /tmp/qa-workflows.png, /tmp/qa-forum.png, /tmp/qa-compute.png

Earlier files named qa-fail-* include selector/hydration harness failures and the confirmed agent-card regression; they are not the final result.

## Buzz reference comparison

Read desktop/src/shared/ui/PageHeader.tsx and desktop/src/features/workflows/ui/WorkflowApprovalCard.tsx in /tmp/buzz-reference-20260912. Header keeps a single title with optional action/description, matching current extracted PageHeader. Buzz's workflow approval card explicitly has no desktop approval action, whereas this frontend supports a clearly labeled local demo decision. No backend parity is implied.

## Limits

This is feature-module frontend coverage, not an exhaustive certification of every permutation, mobile breakpoint, backend integration, or assistive-technology behavior. Pairing, authentication, model downloading and policy enforcement remain disconnected and labeled accordingly. Persistence checked across chat navigation, not browser reload.
