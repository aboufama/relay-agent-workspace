# Shoal Deep Dive frontend handoff

The five integration files are ready under this folder. No repository checkout, backend, runtime state, network adapter, or Sites configuration was changed.

## Files to integrate

- `app/components/DeepDiveView.tsx` — replace the existing component.
- `app/components/deep-dive.css` — replace the existing feature stylesheet.
- `lib/deep-dive.ts` — add the versioned, validated frontend contract.
- `public/deep-dive/clay-ocean.webp` — generated clay underwater environment, 70,834 bytes.
- `public/deep-dive/clay-fish.png` — generated fish vessel, transparent alpha preserved, 204,980 bytes.

Do not integrate this draft folder’s `tsconfig.json`, `globals.d.ts`, or `node_modules` symlink. They were used for isolated checking only. Root integration owner is handling browser QA.

## Behavior

Every current `useAgentMembers()` member is shown, including before a run. Their existing `AgentAvatar` receives `identityKey={member.id}` and the actual member’s character; the component never changes runtime/availability/activity state. Idle water motion is purely decorative and can be paused. Reduced motion disables it.

The center form saves local briefs and sends all current member IDs. Existing drafts are read from `relay.deep-dive.requests.v1`; an unsent composer is preserved in `shoal.deep-dive.composer.v1`.

Submitting shows **Waiting to start** until actual snapshots arrive. No demo tasks, fake subagents, timed progress, fabricated thoughts, or synthetic outputs are included.

Every received agent ID is represented once. Known lead agents keep their workspace avatar. Children follow `parentId`; unknown parents remain visible as independent roots, and malformed cycles are flattened safely rather than hiding any nodes. Subagents without a known workspace identity use their real name’s initials in the generated fish vessel. The Tree view is an accessible nested list with selectable details and real findings/sources.

## Connection options

Use exactly one request integration path:

1. Supply `<DeepDiveView run={snapshot} onDiveRequest={handleRequest} />` for a controlled host.
2. Render the component without props and listen/dispatch browser events.

A supplied `onDiveRequest` replaces the request event; there is no double dispatch. It may return `void` or `Promise<void>`; a rejection produces a handoff error while preserving the brief. In controlled mode the host owns run selection and clearing.

### Outbound request

Event: `shoal:deep-dive:request`. This is a local frontend event, not a network call. The other backend computer should handle authenticated transport and OpenClaw orchestration.

```ts
import { DEEP_DIVE_EVENTS, type DeepDiveRequest } from "@/lib/deep-dive";

window.addEventListener(DEEP_DIVE_EVENTS.request, (event) => {
  const request = (event as CustomEvent<DeepDiveRequest>).detail;
  // Forward through your authenticated runtime adapter.
  // request.requestId is the idempotency/correlation key.
});
```

`DeepDiveRequest` contains:

```ts
{
  version: 1,
  requestId: string,
  title: string,
  brief: string,
  agentIds: string[], // all current workspace agents
  createdAt: string // ISO timestamp
}
```

### Inbound snapshot

Event: `shoal:deep-dive:update`, with `CustomEvent.detail` typed as `DeepDiveSnapshot`.

Send a **complete snapshot** on every update, with a monotonically increasing `revision` for its `runId`. Do not send deltas. Keep already completed agents in the array so all received work remains visible. Duplicate IDs, invalid statuses, or invalid envelope fields are rejected. Old/equal revisions for the same run and updates for a different locally requested `requestId` are ignored.

```ts
type DeepDiveSnapshot = {
  version: 1;
  requestId: string;
  runId: string;
  revision: number;
  status: "queued" | "running" | "complete" | "failed" | "cancelled";
  title?: string;
  brief?: string;
  summary?: string;
  error?: string;
  agents: Array<{
    id: string; // stable OpenClaw node ID
    name: string;
    parentId: string | null; // another OpenClaw node ID; null for a lead
    memberId?: string; // actual workspace identity when available
    status: "queued" | "working" | "waiting" | "complete" | "blocked" | "failed" | "cancelled";
    task?: string;
    output?: string;
    sources?: Array<{ title: string; url: string }>;
  }>;
  sources?: Array<{ title: string; url: string }>;
};
```

```ts
window.dispatchEvent(new CustomEvent(DEEP_DIVE_EVENTS.update, {
  detail: fullSnapshot
}));
```

The component emits `shoal:deep-dive:ready` with `{ version: 1 }` after installing its update listener. The runtime may replay the current snapshot then. For event mode, keep one selected run stream per mounted component. No cancellation or automatic retries are sent by this frontend.

Only HTTP(S) source links are rendered; findings use plain text rather than unsanitized HTML.

## Validation

- Strict TypeScript compilation passed with the existing Next 16.3.5/React 19 repository dependencies.
- Repository Oxlint, including React compiler and type-aware rules, passed.
- 14 direct assertions passed for envelope validation, duplicate/revision rejection, safe source URLs, all-member coverage, nested and out-of-order children, missing parents, and cycle preservation.
- Both generated images were inspected. Fish alpha is present; compression preserved the original imagery.
- Browser/layout checks are left to the root’s existing reviewer. Please verify the ocean’s center panel and scrolling at the app’s real viewport dimensions, plus Tree view on mobile. Mobile Ocean can be panned/zoomed; Tree is the reading-friendly view.

## Image generation provenance

Built-in `image_gen` was used for both assets. Original files remain in:

- `/Users/andreboufama/.codex/generated_images/01a0975c-1800-7620-9b2d-6afee398bfe5/exec-00ab79be-cbd4-4d77-b905-99b81a4566e8.png` — ocean.
- `/Users/andreboufama/.codex/generated_images/01a0975c-1800-7620-9b2d-6afee398bfe5/exec-da107630-b9af-4e7a-b5ad-262d024cd4f4.png` — fish vessel.

### Ocean prompt

Use case: stylized-concept. Asset type: wide background image for the Shoal Deep Dive collaborative AI workspace. Primary request: a beautifully restrained underwater world made entirely from tactile stop-motion clay, matching friendly handcrafted clay character portraits. Scene/backdrop: a tranquil, pale aquamarine open-water diorama, water fading softly from warm misty mint at top to a softly lit dusty teal near bottom. A low sandy sea floor touches only the lowest 12 percent. Very sparse sculpted rounded stones, a small cream coral and muted sage seaweed occupy the two extreme bottom corners. Subtle soft volumetric sunlight from above, just a few tiny suspended clay bubbles at the outer edges. Composition: wide landscape 16:9, viewed straight across underwater, broad uninterrupted clean open water across the central 80 percent and upper 85 percent so real interactive agent sprites and a centered brief panel can be overlaid by an app. Style/materials: meticulously photographed physical miniature set, pleasing soft clay imperfections and gentle fingerprints, matte ceramic-like surfaces, warm natural studio bounce light, softly rounded organic forms, very subtle underwater haze. Palette: desaturated pale sea-glass aqua, greyed mint, cream and sage with a tiny muted apricot accent in corner coral only. Calm sophisticated craft, not saturated kids illustration. No fish, no characters, no diver, no UI, no text, no labels, no lettering, no logos, no watermark, no large central objects, no hard black outline. Deliver one beautiful high-quality landscape background.

### Fish prompt

Use case: stylized-concept. Asset type: one reusable transparent-background character vessel sprite for an underwater collaborative workspace called Shoal. Primary request: a single charming handcrafted clay fish-shaped miniature submarine, side profile facing LEFT, whose big round porthole will later hold the existing avatar portrait of a real AI agent. Fish-shaped smooth plump body made from pale warm cream clay, a small desaturated aqua tail at the RIGHT, small aqua dorsal and lower fins, one large ROUND inset porthole with a thick cream clay rim slightly left of the middle of the body. Window is plain dark desaturated teal with soft glass sheen and no occupants. Porthole occupies nearly half the height of the complete sprite so a recognizable agent face can be overlaid by code. The fish submarine has no separate eyes and no mouth, since the future avatar in the porthole is the face. Handmade stop-motion animation clay, subtle fingerprints, matte tactile surfaces, pleasantly imperfect soft round silhouette, premium miniature set photography, soft light from upper left. Composition: isolated centered whole fish submarine, perfect side-on view, horizontal 3:2 image, generous safe transparent margin, no ground or cast ground shadow, all fins and tail entirely visible. Genuinely transparent background with alpha, no scene, no white or colored background, no checkerboard baked in, no text, no UI, no logo, no multiple views, no sprite sheet, no other objects. Render one single fish submarine large and clean.

## Interface changes

| Before | After |
| --- | --- |
| Plain local research request list | Clay ocean workspace with a centered brief, real agent avatars in generated fish vessels, and visible subagent branches |
| Draft-only request saving | Preserved drafts plus a typed handoff request with an honest waiting state |
| No live hierarchy or findings | Complete snapshots drive a parent-linked ocean map, accessible tree, selected agent details, real findings, and safe sources |
| Static page presentation | Subtle paused/reduced-motion-aware swimming, scoped layered shadows, concentric card controls, tabular counts, balanced headings, and explicit hover/focus states |
| No graph navigation | Native scroll/drag, zoom controls, fit control, and a responsive list counterpart |

