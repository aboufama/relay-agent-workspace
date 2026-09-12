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
  { id: 'lab', name: 'Dell GB10', kind: 'local', status: 'preview', location: 'Dell Pro Max · NVIDIA GB10' },
  { id: 'openai-preview', name: 'Cloud', kind: 'cloud', status: 'preview', provider: 'OpenAI' },
];
let homes = initialHomes;
const listeners = new Set<() => void>();
let healthTimer: ReturnType<typeof setInterval> | undefined;
let checkingHealth = false;
async function refreshRuntimeHealth() {
  if (checkingHealth) return;
  checkingHealth = true;
  const disconnected = () => { if (homes.some(home=>home.id==='lab' && home.status==='connected')) publish(homes.map(home=>home.id==='lab' ? {...home,status:'preview' as const} : home)); };
  try {
    const response = await fetch('/api/runtime', { signal: AbortSignal.timeout(7000) });
    if (!response.ok) { disconnected(); return; }
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('homes' in data) || !Array.isArray(data.homes)) { disconnected(); return; }
    const verified = data.homes.find((home: unknown) => home && typeof home === 'object' && 'id' in home && home.id === 'lab');
    if (!verified || typeof verified !== 'object' || !('connected' in verified)) { disconnected(); return; }
    const connected = verified.connected === true;
    const next = homes.map(home => home.id === 'lab' ? { ...home, name: 'Dell GB10', location: 'Dell Pro Max · NVIDIA GB10', status: connected ? 'connected' as const : 'preview' as const } : home);
    if (next.some((home, index) => home.name !== homes[index].name || home.status !== homes[index].status)) publish(next);
  } catch { disconnected(); }
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
