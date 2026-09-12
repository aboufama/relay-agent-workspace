'use client';

import { useSyncExternalStore } from 'react';
import { buzz } from './buzz/store';

export type AgentHome = {
  id: string;
  name: string;
  kind: 'local' | 'cloud';
  status: 'preview' | 'pending' | 'connected';
  location?: string;
  provider?: string;
};

const initialHomes: readonly AgentHome[] = [
  { id: 'openai-preview', name: 'OpenAI', kind: 'cloud', status: 'preview', provider: 'OpenAI' },
  {
    id: 'lab',
    name: 'Meridian Lab',
    kind: 'local',
    status: 'preview',
    location: 'Engineering · Sample device',
  },
  {
    id: 'studio',
    name: 'Studio',
    kind: 'local',
    status: 'preview',
    location: 'Operations · Sample device',
  },
  {
    id: 'cloud-preview',
    name: 'Anthropic',
    kind: 'cloud',
    status: 'preview',
    provider: 'Anthropic',
  },
];
let homes = initialHomes;
const listeners = new Set<() => void>();
let healthTimer: ReturnType<typeof setInterval> | undefined;
let checkingHealth = false;
async function refreshRuntimeHealth() {
  if (checkingHealth) return;
  checkingHealth = true;
  try {
    // buzz.runtime() also stores the observed nodes in the shared store (useBuzz().nodes).
    const data = await buzz.runtime();
    const verified = data.homes.find((home) => home.id === 'lab');
    if (!verified) return;
    const next = homes.map(home => home.id === 'lab' ? { ...home, name: verified.name, location: `Inference · ${verified.model}`, status: verified.connected ? 'connected' as const : 'preview' as const } : home);
    if (next.some((home, index) => home.name !== homes[index].name || home.status !== homes[index].status || home.location !== homes[index].location)) publish(next);
  } catch { /* Health is advisory; chat reports retryable connection failures. */ }
  finally { checkingHealth = false; }
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    void refreshRuntimeHealth();
    healthTimer = setInterval(() => { void refreshRuntimeHealth(); }, 30000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && healthTimer) { clearInterval(healthTimer); healthTimer = undefined; }
  };
};
const getSnapshot = () => homes;
const getServerSnapshot = () => initialHomes;

export function useAgentHomes(): readonly AgentHome[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function isAgentHomeAvailable(home: AgentHome): boolean {
  return home.status !== 'pending';
}
function publish(next: readonly AgentHome[]) {
  homes = next;
  listeners.forEach((listener) => listener());
}
// Configuration alone never marks a runtime connected. Verification belongs to
// the authenticated backend integration, which this preview does not have.
export function addPendingAgentHome(input: {
  name: string;
  kind: 'local' | 'cloud';
  location?: string;
  provider?: string;
}): AgentHome {
  const home: AgentHome = {
    ...input,
    name: input.name.trim(),
    id: `home-${crypto.randomUUID()}`,
    status: 'pending',
  };
  publish([...homes, home]);
  return home;
}
export function removePendingAgentHome(id: string): void {
  publish(homes.filter((home) => home.id !== id || home.status !== 'pending'));
}
