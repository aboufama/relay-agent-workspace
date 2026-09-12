# Independent Holo stack verification

Verified 2026-09-12 20:22:48.607–20:22:50.073 UTC through authenticated Dell gateway port 8010.

- Request model: `openclaw/default`.
- Prompt: `Independent verification marker RELAY-HOLO-SEP12-2027. Do not use tools. Compute 137 * 29. Reply with exactly the marker, one space, and the integer result.`
- Response: `RELAY-HOLO-SEP12-2027 3973` (correct), 1.47 seconds.
- Completion ID: `chatcmpl_90cc4463-0dfc-4d34-9819-c9cf1a178799`.
- OpenClaw sandbox logs independently correlated the same marker and completion ID with NemoClaw registration, model `holo`, POST `https://inference.local/v1/chat/completions`, HTTP 200.
- OpenShell sandbox logs at 20:22:48.856Z recorded `OCSF NET:OPEN [INFO] ALLOWED inference.local:443` and `openshell_router: routing proxy inference request (streaming)`.
- Running healthy sandbox image: `ghcr.io/nvidia/nemoclaw/openclaw-sandbox`.
- OpenClaw configuration: primary `inference/holo`; provider base URL `https://inference.local/v1`.
- Running model container: `relay-holo`, image `vllm/vllm-openai:v0.28.0-ubuntu2404`, `/home/dell/models/Holo-3.1-35B-A3B-NVFP4` mounted at `/model`, served model name `holo`, context 32768, tool parser `qwen3_coder`.
- Existing installation receipt identifies `Hcompany/Holo-3.1-35B-A3B-NVFP4`; model configuration contains ModelOpt mixed precision/NVFP4 quantization.
- GET `/relay/setup` reported ready; GET `/v1/models` advertised `openclaw/default`.

Read-only inspection and one authorized inference only. No credentials printed. This verifies the running local gateway path, not hosted browser interaction, stress performance, or hackathon eligibility. Model mount/config and installation receipt were checked; full checkpoint hashes were not recomputed.

## Published app verification

The site server and actual browser UI subsequently passed two-turn DM recall (OLIVE) and channel @Atlas routing (RELEASE_OK). All three actual SSE calls returned HTTP 200, completed in 1.61–1.74 seconds, and generated no browser page errors. After completion the avatar returned to idle. The deployed runtime configuration targets `openclaw/default`; Holo remains the inference model.
