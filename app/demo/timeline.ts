export const duration = 120;
export const appStart = 23;
export const appEnd = 112;
export const scenes = [
  {
    id: 'opening',
    start: 0,
    end: 6,
    label: 'Meet Shoal',
    cue: 'Shoal: A team communication platform built from the ground up to natively support local LLMs.',
  },
  {
    id: 'tokens',
    start: 6,
    end: 12,
    label: 'Token waste',
    cue: 'Ninety-nine cents of every AI dollar is thrown away re-buying the exact same tokens.',
  },
  {
    id: 'security',
    start: 12,
    end: 18,
    label: 'Data exposure',
    cue: 'Sensitive files like legal contracts or financial records are exposed to unapproved agents.',
  },
  {
    id: 'stack',
    start: 18,
    end: 23,
    label: 'The full stack',
    cue: 'NemoClaw sets it up. OpenClaw does the work. OpenShell controls execution.',
  },
  {
    id: 'data',
    start: 23,
    end: 29,
    label: 'Bell’s data',
    cue: 'Map company context locally instead of re-sending it with every prompt.',
  },
  {
    id: 'setup',
    start: 29,
    end: 36,
    label: 'Bring GB10 online',
    cue: 'Connect and configure the agents, sandbox, and model so they operate together.',
  },
  {
    id: 'create',
    start: 36,
    end: 43,
    label: 'Create Cedar Analyst',
    cue: 'Agents operate as integrated team members.',
  },
  {
    id: 'finance',
    start: 43,
    end: 54,
    label: 'Ask Ledger',
    cue: 'When you @mention a finance agent, OpenClaw manages the session.',
  },
  {
    id: 'thread',
    start: 54,
    end: 64,
    label: 'Coordinate specialists',
    cue: 'Coordinate specialists and draw from a local memory pool that compounds from past tasks.',
  },
  {
    id: 'resume',
    start: 64,
    end: 76,
    label: 'Resume the session',
    cue: 'If an agent crashes or restarts, it doesn’t get amnesia. The active session stays on the machine.',
  },
  {
    id: 'access',
    start: 76,
    end: 88,
    label: 'Restrict a file',
    cue: 'Classify the file as Restricted and control exactly which agents can see it.',
  },
  {
    id: 'blocked',
    start: 88,
    end: 95,
    label: 'Unapproved access blocked',
    cue: 'Unapproved agents are completely blocked from reading it.',
  },
  {
    id: 'draft',
    start: 95,
    end: 101,
    label: 'Prepare a draft',
    cue: 'Agents handle the heavy lifting by drafting work locally.',
  },
  {
    id: 'approval',
    start: 101,
    end: 107,
    label: 'Human approval',
    cue: 'Humans maintain final approval. Autonomous velocity meets enterprise control.',
  },
  {
    id: 'decision',
    start: 107,
    end: 112,
    label: 'Keep the decision',
    cue: 'Local sessions retain the decision. Local inference avoids cloud token charges.',
  },
  {
    id: 'economics',
    start: 112,
    end: 117,
    label: 'Local economics',
    cue: 'Zero cloud inference charges; an illustrative $160,000 enterprise setup.',
  },
  {
    id: 'closing',
    start: 117,
    end: 120,
    label: 'Shoal',
    cue: 'Your knowledge compounds safely. Your team stays in control.',
  },
] as const;
export type SceneId = (typeof scenes)[number]['id'];
export function sceneAt(t: number) {
  return (
    scenes.find((s) => t >= s.start && t < s.end) ?? scenes[scenes.length - 1]
  );
}
export function stamp(t: number) {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}
export function runtimeTime(t: number) {
  return t < appStart ? 0 : t;
}
