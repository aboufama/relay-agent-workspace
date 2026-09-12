'use client';
import { useEffect, useState } from 'react';
import { useAgentState } from './AgentAvatar';
export function AgentThinkingBubble({ name, preview = false }: { name: string; preview?: boolean }) {
  const state = useAgentState(name);
  const show = preview || state === 'thinking';
  const [presence, setPresence] = useState<'shown' | 'hiding' | 'hidden'>(show ? 'shown' : 'hidden');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const frame = requestAnimationFrame(() => {
      if (show) setPresence('shown');
      else {
        setPresence('hiding');
        timer = setTimeout(() => setPresence('hidden'), 180);
      }
    });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [show]);
  if (presence === 'hidden') return null;
  return <output className="agent-thinking-bubble" data-presence={presence}
    aria-label={preview && state !== 'thinking' ? `${name} bubble animation` : `${name} is thinking`}>
    <span className="agent-thinking-animation" aria-hidden="true" />
    <span className="agent-thinking-static" aria-hidden="true">···</span>
  </output>;
}
