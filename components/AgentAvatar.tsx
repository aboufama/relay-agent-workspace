'use client';

import { useSyncExternalStore, type CSSProperties } from 'react';

import { type AgentCharacter } from '@/lib/agent-characters';
export { AGENT_CHARACTERS, type AgentCharacter } from '@/lib/agent-characters';
export type AgentState = 'idle' | 'sleep' | 'thinking' | 'stuck';
export type AgentActivity = 'ready' | 'working' | 'blocked' | 'offline' | 'sleeping' | 'paused';
export const AGENT_STATES: AgentState[] = ['idle', 'sleep', 'thinking', 'stuck'];

type Identity = { character?: AgentCharacter; state?: AgentState; available?: boolean; paused?: boolean };
function effectiveState(identity?: Identity): AgentState { return identity?.paused ? 'sleep' : identity?.state ?? (identity?.available === false ? 'sleep' : 'idle'); }
const identities = new Map<string, Identity>();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function updateIdentity(name: string, changes: Identity) {
  const previous = identities.get(name);
  const next = { ...previous, ...changes };
  if (previous?.character === next.character && previous?.state === next.state && previous?.available === next.available && previous?.paused === next.paused) return;
  identities.set(name, next);
  for (const notify of listeners) notify();
}

export function setAgentAvatarIdentity(name: string, character: AgentCharacter, state?: AgentState) {
  updateIdentity(name, state ? { character, state } : { character });
}

/** Called by the runtime adapter when an agent's activity changes. */
export function setAgentAvailability(id: string, available: boolean, paused: boolean, character: AgentCharacter) { updateIdentity(id, { available, paused, character }); }

export function setAgentActivity(name: string, activity: AgentActivity) {
  const states: Record<AgentActivity, AgentState> = {
    ready: 'idle', working: 'thinking', blocked: 'stuck',
    offline: 'sleep', sleeping: 'sleep', paused: 'sleep',
  };
  updateIdentity(name, { state: activity === 'ready' ? undefined : states[activity] });
}

const POSITIONS: Record<AgentState, string> = {
  idle: '0% 0%', sleep: '100% 0%', thinking: '0% 100%', stuck: '100% 100%',
};

export function useAgentState(name: string): AgentState {
  return useSyncExternalStore(subscribe, () => effectiveState(identities.get(name)), () => 'idle');
}

/** Select a sheet quadrant, then inset its circular portrait without exposing its frame. */
export function AgentAvatar({
  character = 'worm', state = 'idle', size = 32, label, identityKey, className = '', preview = false,
}: {
  character?: AgentCharacter; state?: AgentState; size?: number; label?: string;
  identityKey?: string; className?: string; preview?: boolean;
}) {
  const identity = useSyncExternalStore(
    subscribe,
    () => !preview && (identityKey || label) ? identities.get(identityKey || label!) : undefined,
    () => undefined,
  );
  character = identity?.character ?? character;
  state = identity ? effectiveState(identity) : state;
  const frame: CSSProperties = {
    backgroundImage: `url(/agents/${character}.png)`,
    backgroundPosition: POSITIONS[state],
    backgroundSize: '200% 200%',
  };
  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A CSS sprite exposes one cropped state as an accessible image.
    <span role="img" aria-label={label ?? `${character} · ${state}`}
      data-agent-id={identityKey} data-agent-character={character} data-agent-state={state}
      className={`agent-sprite ${className}`} style={{ width: size, height: size }}>
      <span aria-hidden="true" className="agent-sprite-frame" style={frame} />
    </span>
  );
}
