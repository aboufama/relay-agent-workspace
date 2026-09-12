/** Frontend-only handoff for the OpenClaw runtime. No network or runtime side effects. */
export const DEEP_DIVE_EVENTS = {
  request: "shoal:deep-dive:request",
  update: "shoal:deep-dive:update",
  ready: "shoal:deep-dive:ready",
} as const;

export type DeepDiveRequest = {
  version: 1;
  requestId: string;
  title: string;
  brief: string;
  agentIds: string[];
  createdAt: string;
};

export type DeepDiveAgentStatus = "queued" | "working" | "waiting" | "complete" | "blocked" | "failed" | "cancelled";
export type DeepDiveRunStatus = "queued" | "running" | "complete" | "failed" | "cancelled";
export type DeepDiveSource = { title: string; url: string };

export type DeepDiveAgent = {
  /** Stable OpenClaw agent/task ID. Every unique received ID is rendered. */
  id: string;
  name: string;
  /** A node ID from this snapshot; null means a lead agent. */
  parentId: string | null;
  /** Optional workspace identity, used to show that member's actual live avatar. */
  memberId?: string;
  status: DeepDiveAgentStatus;
  task?: string;
  output?: string;
  sources?: DeepDiveSource[];
};

export type DeepDiveSnapshot = {
  version: 1;
  requestId: string;
  runId: string;
  /** Monotonically increasing for a run. Updates are complete snapshots, not patches. */
  revision: number;
  status: DeepDiveRunStatus;
  title?: string;
  brief?: string;
  summary?: string;
  error?: string;
  agents: DeepDiveAgent[];
  sources?: DeepDiveSource[];
};

const agentStatuses = new Set<DeepDiveAgentStatus>(["queued", "working", "waiting", "complete", "blocked", "failed", "cancelled"]);
const runStatuses = new Set<DeepDiveRunStatus>(["queued", "running", "complete", "failed", "cancelled"]);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const optionalText = (value: unknown) => value === undefined || typeof value === "string";
const sourcesValid = (value: unknown) => value === undefined || (Array.isArray(value) && value.every((source) => record(source) && typeof source.title === "string" && typeof source.url === "string"));

/** Validate browser event boundaries without accepting partial or fabricated state. */
export function isDeepDiveSnapshot(value: unknown): value is DeepDiveSnapshot {
  if (!record(value) || value.version !== 1 || typeof value.requestId !== "string" || !value.requestId || typeof value.runId !== "string" || !value.runId || typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 0 || !runStatuses.has(value.status as DeepDiveRunStatus) || !Array.isArray(value.agents)) return false;
  if (![value.title, value.brief, value.summary, value.error].every(optionalText) || !sourcesValid(value.sources)) return false;
  const ids = new Set<string>();
  return value.agents.every((agent) => {
    if (!record(agent) || typeof agent.id !== "string" || !agent.id || ids.has(agent.id) || typeof agent.name !== "string" || !agent.name || !(agent.parentId === null || typeof agent.parentId === "string") || !agentStatuses.has(agent.status as DeepDiveAgentStatus) || ![agent.memberId, agent.task, agent.output].every(optionalText) || !sourcesValid(agent.sources)) return false;
    ids.add(agent.id);
    return true;
  });
}

export function safeDeepDiveSource(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}
