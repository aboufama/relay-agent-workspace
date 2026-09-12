# Shoal Bell voiceover demo

A 2:00 silent film at 1920 × 1080, with the exact production Workspace UI and original artwork. The Bell workflow runs through an isolated browser API adapter. Replies, runtime recovery, setup, and approval are simulated; the film does not provision a computer or change live company records.

## Outputs

- `output/shoal-demo/shoal-bell-demo.mp4`: H.264, 30 fps, ready for narration.
- `output/shoal-demo/shoal-bell-demo.html`: self-contained browser replay.
- `output/shoal-demo/shoal-demo-current.zip`: MP4, replay, and notes.
- `http://localhost:3000/demo`: player and download buttons.
- `output/shoal-demo/previous-cut/`: the previous cut, preserved locally.

The player supports playback, restart, scene navigation, presentation mode, and attaching a local voiceover. Audio stays in the browser and supplies the playback clock so buffering does not desynchronize the picture. No narration audio was supplied: these are editorial cue timings, not measured word-aligned timestamps.

## Cut and script cues

| Time | Picture | Script beat |
|---|---|---|
| 0:00–0:06 | Exact Shoal introduction, Dell GB10, NVIDIA stack | Introduce the platform |
| 0:06–0:12 | 99¢ repeated-context graphic | Token waste |
| 0:12–0:18 | $5.4m breach graphic | Unapproved access |
| 0:18–0:23 | User-supplied architecture diagram | NemoClaw sets up, OpenClaw executes, OpenShell contains/routes |
| 0:23–0:29 | Bell Data, supplier-file details | Map local context |
| 0:29–0:36 | Bring Dell GB10 online | Configure the model and sandbox |
| 0:36–0:43 | Name and create Cedar Analyst | Integrated team members |
| 0:43–0:54 | Type @Ledger; answer streams in | Finance agent within the workflow |
| 0:54–1:04 | Open thread; Nova checks qualification | Delegate to specialists |
| 1:04–1:16 | Visible session interruption, Retry, ask where we left off | Preserve local session memory |
| 1:16–1:28 | One continuous drag through security depths; grant Ledger | Restrict data access |
| 1:28–1:35 | Ask Scout; access is refused | Block an unapproved reader |
| 1:35–1:41 | Ask for an engineering draft without supplier terms | Local drafting |
| 1:41–1:47 | Read draft, approve, see recorded status | Human control |
| 1:47–1:52 | Ledger acknowledges the decision; human reacts | Retain the reviewed result; begin local-cost narration |
| 1:52–1:57 | $0 cloud inference / $160,000 setup scenario | Local economics |
| 1:57–2:00 | Shoal close | Knowledge compounds safely |

This cut preserves Data and Habitats early and concentrates the remaining app footage on a single sourcing conversation. No page-bottom tours. The draft sits immediately before approval, matching the script’s order. Short replies develop over time instead of appearing as full paragraphs at once; portraits reflect active runs. The viewer sees a Retry action during recovery, one continuous file drag, time to read the approval, and a five-second cost comparison.

## Rebuild

1. `node scripts/export-shoal-demo.mjs` bundles the production UI and player into the standalone replay.
2. With Playwright and FFmpeg available, `node scripts/record-shoal-demo.mjs` records the uninterrupted replay, encodes the MP4, and refreshes downloads.

If Playwright is installed outside the repository, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path; `CHROMIUM_PATH` can select an existing Chromium executable. The recorder removes a measured black pre-roll, checks duration/resolution/frame rate, and updates downloads only after a successful encode.

Editorial scenes live in `app/demo/timeline.ts`; native actions and isolated fixture transport live in `app/demo/replay-runtime.ts`. All footage changes are confined to the demo. The architecture image lives in `public/demo-art/shoal-architecture.png`; it was supplied by the user and edited with built-in imagegen solely to replace the bottom model/hardware labels with Holo-3.1 and Dell GB10. The editing prompt is alongside the image.

## Evidence and scope

Bell data is synthetic: $918,800 conditional plan versus $944,000 all-A, $25,200 potential savings, and 1,400 systems awaiting alternate qualification. Approve records an isolated demo decision. The retry demonstrates the intended recovery interaction, not a measured hardware-crash test. Stream timing is editorial, not an inference-speed benchmark.

The 99¢ figure is an illustrative script scenario, not an established industry average. The $5.4m figure refers to IBM’s 2022 critical-infrastructure cohort without a zero-trust approach, not the global average: https://newsroom.ibm.com/2022-07-27-IBM-Report-Consumers-Pay-the-Price-as-Data-Breach-Costs-Reach-All-Time-High

The $160,000 amount is an illustrative enterprise deployment budget. Zero cloud inference assumes local-only model requests; hardware, power, and software costs remain. Neither the artwork nor the replay proves a universal cost saving, leak-prevention guarantee, or live NVIDIA integration.

## Review of the revised cut

| Before | After |
|---|---|
| Updated opening existed only in the browser replay | The MP4 is rebuilt from the current source with the exact opening headline |
| Three stack cards | Supplied architecture diagram, with only model/hardware labels corrected |
| Five-second opening; two-second economics and close | Six-second opening, five-second economics, three-second close |
| Drafting preceded restart and privacy | Collaboration → recovery → restriction → refusal → draft → approval |
| Full responses appeared at once with little reading time | Concise responses stream into the actual message components, followed by reading holds |
| Response state did not drive portraits | Isolated run records update portraits while agents work |
| Profile popup implied a restart | Native interrupted-message state and Retry show recovery before the retained-context question |
| Three separate classification drops | One continuous drag with a cursor, hovering through each depth and dropping once |
| Dense technical approval fixture and a rushed click | Relevant engineering draft, three seconds of review, then approval and acknowledgement |
| Decision response could appear independently of approval | The acknowledgement requires the simulated approval receipt |
| Reaction could clip behind the composer | A minimal message reveal keeps it visible |
| Chapter seeking skipped navigation and dialog prerequisites | Pure checkpoints restore the right records, page, thread, editor, or review state |
| Audio and visual playback used separate clocks | Attached audio drives the picture; pause, buffering, seek, errors, and ending are handled |
| Player reported ready before app initialization | Readiness waits for the child handshake and visible assets; hidden-iframe fonts cannot deadlock playback |
| Ad hoc exports could leave stale downloads | Repeatable recorder measures pre-roll, verifies the encode, and updates downloads atomically |

Validation: focused TypeScript and lint pass. A full native replay completed with zero browser errors. Direct seeks to the thread, agent editor, approved review, Data, and start restore the correct views. An independent 120-second generated audio test passed loading at 45 seconds, playback, pause, forward/backward seek, and ending at 120 seconds; observed picture/audio difference was about 4 ms. This test validates playback synchronization, not alignment to an absent recorded narration. Export metadata, frames, and reports live in `output/shoal-demo/qa-natural/`.
