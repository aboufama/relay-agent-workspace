# Bell Corporation engineering demo

Bell is a fictional computer and server manufacturer: a playful nod to Dell. Its Client & Infrastructure Engineering division develops rack servers, mobile workstations, fleet firmware, and power systems. Every product, person other than the operator, measurement, incident, price, policy, and conversation in this corpus is invented. The snapshot is dated September 12, 2026.

The app opens on Projects with four program briefs, decision owners, dependencies, and task completion calculated from the database. Compute contains the six agent profiles. Data holds twelve downloadable, searchable Markdown sources across eight collections. Five channels contain twenty example messages. Three demo approval requests record decisions without executing commands or publishing anything.

## The six agents

| Agent | Purpose and success condition | Access | Primary context path | Human decision |
|---|---|---|---|---|
| Atlas | Determine whether Compass 3.4.2 meets every pilot gate; identify missing recovery and security evidence | Restricted; firmware vault explicitly granted, supplier vault excluded | Bell / Restricted / Firmware Security; Compass firmware and Summit design | Olivia approves firmware and promotion; Orion approves source export |
| Sage | Prepare an approved engineering readout with a next gate, owner, and blocker for every program | Internal; approved release summaries and public references | Bell / Engineering / Release Office | Olivia confirms status; Orion approves broad publication |
| Nova | Propose a Horizon fan curve meeting sustained power, skin temperature, junction temperature, and acoustic limits | Confidential; thermal lab and platform design | Bell / Engineering / Validation / Thermal Lab | Marcus approves qualification; Olivia approves firmware changes |
| Iris | Separate field observations from hypotheses and define a reproducible dock-resume confirmation | Confidential; sanitized quality evidence and firmware notes | Bell / Engineering / Quality / Sanitized Cases | Marcus approves incident conclusions and closure |
| Scout | Answer public product questions without revealing unpublished information | Public only; no internal, lab, security, or pricing sources | Bell / Public / Product Reference | Orion reviews any new public claim |
| Ledger | Quantify qualified launch supply, conditional alternate supply, cost, and shortage exposure | Restricted; sourcing vault explicitly granted, firmware vault excluded | Bell / Restricted / Sourcing / Cedar | Orion approves sourcing; Marcus approves alternate qualification |

All six use the configured local runtime. They are distinct identities and context scopes, not six claimed model installations. Compute reports observed service status. Logical paths identify the demo source boundaries; they do not imply connected GitHub, Jira, Slack, purchasing, signing, or device-management services. Native tool permissions remain separately configured by the runtime owner.

## Five-minute walkthrough

1. **Projects → Summit R8.** Open the DVT program brief. Show the September 24 decision, Compass/Cedar dependencies, assigned specialists, and the blocked launch-coverage task. Task completion and scenario gate status are deliberately separate.
2. **Compute → Atlas.** Show the concrete goal, source collections, access paths, review gate, and suggested prompts. Open the `firmware-gate` channel and ask: “Is Compass 3.4.2 ready for the 250-system pilot? Cite each unmet criterion.” The synthetic evidence has six negative compatibility cases, fifty interrupted-update cycles, and thirty-six hours of soak still outstanding.
3. **Data → context search.** Compare Atlas and Ledger using “Bell” or a more specific question. Atlas can retrieve the firmware finding, but not supplier terms. Ledger has the reverse vault grant. Scout returns only the two public briefs.
4. **Horizon 14.** Ask Nova to compare curves A and B. A meets temperature but misses acoustics; B meets acoustics but misses the skin limit by 0.3°C. Neither passes every criterion. Ask Iris about docking: 18/600 devices is 3% overall incidence, while the exact affected-configuration denominator is unknown.
5. **Deep Dive.** Open the Cedar example, inspect the project and Ledger assignment, then save or Run Deep. Saving creates a shared Research task; Run Deep queues the existing runner. The UI displays recorded status and result, with Retry Deep or Go deeper when applicable. Without a runner, the request stays queued and says so.
6. **Workflows → Approvals.** Review a request prefixed “Demo review.” Its exact action is `demo_review`: approval records a decision only. Real native command approvals are separate and require the actual runtime integration.

## Program evidence

- **Summit R8:** reference peak load is 966 W, or 1,062.6 W with 10% margin. Each 1,200 W module must carry the full reference load in 1+1 redundancy.
- **Horizon 14:** the thermal target is sustained 28 W, skin ≤43°C, acoustics ≤35 dBA, and junction ≤95°C under the stated lab conditions. Undocked sleep/resume passed 500/500 cycles; docking validation remains open.
- **Compass 3.4.2:** 40 successful installations do not imply promotion approval. Recovery is 150/200 complete, security negatives are 18/24 complete, and soak is 36/72 hours.
- **Cedar:** 4,000 servers need 8,000 modules. Qualified A supply supports 2,600 systems. The conditional A/B plan costs $918,800, $25,200 below the hypothetical all-A full build, but B is not qualified: its 11.2 ms hold-up misses the 12 ms requirement.

## Source and persistence

The authored corpus is [lib/buzz/bell-demo.json](../lib/buzz/bell-demo.json). [bell-seed.ts](../lib/buzz/bell-seed.ts) loads it once into the existing D1/R2 bindings. Documents get stored bytes, chunks, and a keyword index, so the demo can retrieve evidence without an embedding server. New imports can use configured embedding/reranking services.

The seed does not enqueue model runs, set connected telemetry, or fabricate execution receipts. Existing conversations, custom documents, rules, and non-default profiles remain. Known original seed profiles are upgraded only when their name, original instructions, local home, runtime, and original context match. Existing human records remain as they were. The `bell_demo_v1` setting makes repeat page loads idempotent. Future corpus changes need an explicit migration; editing the JSON does not silently replace records in an already seeded workspace.

This is a single-operator demonstration. The operator can inspect all fictional source files; per-agent retrieval filters are not a substitute for authenticated multi-user authorization. Classification changes in Data preserve named grants, and Restricted imports require named agents.

## Verify the demo

With the app running:

```sh
node scripts/check-bell-demo.mjs http://localhost:5188
```

This read-only check validates the six profiles, sixteen seeded tasks, twelve sources, twenty example messages, exact source sets for each agent, original document bytes, and repeat-load counts. It does not claim a model completed work. Verify actual execution on the configured local runner separately.
