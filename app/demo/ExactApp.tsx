'use client';
import { useEffect, useState } from 'react';
import { Workspace } from '../Workspace';
import { setWorkspaceName } from '@/lib/workspace-name';
import { installReplayRuntime } from './replay-runtime';

/** The production Workspace, unchanged. Only the API transport uses Bell fixtures. */
export function ExactApp() {
  const [ready, setReady] = useState(false);
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const dispose = installReplayRuntime();
    setWorkspaceName('Bell Corporation');
    const remount = () => setEpoch((v) => v + 1);
    window.addEventListener('shoal:remount', remount);
    const frame = requestAnimationFrame(() => {
      setReady(true);
      window.parent.postMessage({ type: 'shoal:app-ready' }, '*');
    });
    return () => {
      cancelAnimationFrame(frame);
      dispose();
      window.removeEventListener('shoal:remount', remount);
    };
  }, []);
  return ready ? <Workspace key={epoch} /> : null;
}
