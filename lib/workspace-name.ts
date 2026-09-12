'use client';
import { useEffect, useSyncExternalStore } from 'react';
let name = 'Bell Engineering';
let hydrated = false;
const key = 'relay.bell.workspace-name.v1';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => {listeners.delete(listener)}; };
function publish(value: string) { name = value.trim().slice(0, 60) || 'Bell Engineering'; listeners.forEach(listener => listener()); }
export function useWorkspaceName() {
  const value = useSyncExternalStore(subscribe, () => name, () => 'Bell Engineering');
  useEffect(() => {
    if (!hydrated) { hydrated = true; try { publish(localStorage.getItem(key) || 'Bell Engineering'); } catch { /* Session remains editable. */ } }
    const changed = (event: StorageEvent) => { if (event.key === key) publish(event.newValue || 'Bell Engineering'); };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  return value;
}
export function setWorkspaceName(value: string) { publish(value); try { localStorage.setItem(key, name); } catch { /* Session remains editable. */ } }
