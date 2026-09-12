# Shoal

A local agent workspace for product design and customer support. The frontend uses React, TypeScript and Vinext. Cloudflare D1 and R2 bindings provide shared workspace records and document storage; the local demo uses Wrangler's local emulation.

## Runtime

```
Shoal UI → workspace API + durable run queue → local runner
         → OpenClaw in a NemoClaw-managed OpenShell sandbox
         → inference.local → local vLLM model
```

OpenClaw executes tools and delegates to the `product` and `support` agents. NemoClaw configures the agent roster and sandbox. OpenShell enforces the sandbox's filesystem/network policy and routes inference to the local model. There is no direct inference fallback in the runner and no hosted LLM in this path.

Quick uses an 8,192-token submitted budget with a 2,048-token output reserve. Deep uses 20,480 with a 4,096-token output reserve. OpenClaw adds its own instructions and tool history, so these budgets leave headroom in the current 32K model configuration. Go deeper preserves the original task/session. Actual model usage can exceed the submitted context count because it includes multiple native calls.

## Local setup

Use Node 22.13 or later:

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Create an ignored, owner-readable `.dev.vars` with server settings:

```dotenv
BUZZ_API=http://127.0.0.1:5174
BUZZ_OPENCLAW_URL=http://127.0.0.1:18790
BUZZ_OPENCLAW_TOKEN=<native gateway token>
BUZZ_OPENCLAW_AGENT=main
BUZZ_RUNNER_TOKEN=<random runner secret>
BUZZ_VLLM_URL=http://127.0.0.1:8000/v1
BUZZ_MODEL=holo
BUZZ_EMBED_URL=http://127.0.0.1:8001/v1
BUZZ_EMBED_MODEL=embed
BUZZ_RERANK_URL=http://127.0.0.1:8002
BUZZ_RERANK_MODEL=rerank
BUZZ_CONCURRENCY=1
```

Optional `BUZZ_VLLM_TOKEN`, `BUZZ_EMBED_TOKEN` and `BUZZ_RERANK_TOKEN` authenticate the corresponding local service. The `BUZZ_` prefix is retained for existing installations. Never put credentials in client code or Git.

After the web app initializes its database, apply migrations and start the runner with the same environment:

```sh
python3 scripts/migrate-local.py
node --env-file=.dev.vars runner/buzz-runner.mjs
```

The migration script backs up an existing local SQLite database before changing it. Persistent deployments use dedicated systemd user services for the web app, runner and native approval bridge. The parent workspace's `runtime/install-local.py` installs the web/runner services beside a configured local sandbox.

## Working demo paths

- Chat and tasks save messages, run attempts, outcomes and context packets in D1.
- Text/Markdown/code documents are stored in R2, chunked and embedded locally. Retrieval combines keyword and vector candidates, then locally reranks them. Classification, collection, audience and named-agent grants filter candidates before ranking.
- Data shows keyword-only ingestion if embeddings are unavailable. PDF/DOCX extraction is not implemented.
- Native command requests appear in Inbox/Workflows with their exact command and working directory. The host bridge forwards explicit human decisions to OpenClaw. A decision receipt records permission; execution must still be verified from the native result/artifact.
- Queued work survives runner restart. An expired in-flight lease becomes a visible failure so potentially completed side effects are not blindly replayed.
- `GET /api/runtime` reports observed model and gateway availability.

## Validation and scope

```sh
npx tsc --noEmit
npm run build
```

The demo is for one trusted operator, bound to loopback and accessed remotely through SSH. Production multiuser authentication, cross-node scheduling, external app connectors, voice/video transport and executable workflow templates remain future work. Native child agents receive the coordinator's bounded evidence packet; they do not yet have a separate per-child retrieval API. Local browser notes/preferences and workflow templates are separate from the shared backend records above.

The repository's upstream UI is reviewed separately from runtime changes. Do not replace the durable backend with an upstream mock or browser-only state implementation when updating presentation components.
