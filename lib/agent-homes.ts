'use client';

import { useSyncExternalStore } from 'react';

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
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
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
