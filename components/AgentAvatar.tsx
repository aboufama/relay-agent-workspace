'use client';
import { useSyncExternalStore, type CSSProperties } from 'react';
export type AgentCharacter = 'worm' | 'firefly' | 'ladybug' | 'caterpillar';
export type AgentState = 'idle' | 'sleep' | 'thinking' | 'stuck';
export const AGENT_CHARACTERS: AgentCharacter[] = ['worm','firefly','ladybug','caterpillar'];
export const AGENT_STATES: AgentState[] = ['idle','sleep','thinking','stuck'];
const identities = new Map<string, { character: AgentCharacter; state: AgentState }>();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setAgentAvatarIdentity(name: string, character: AgentCharacter, state: AgentState) {
 identities.set(name, {character,state}); for (const notify of listeners) notify();
}
const POSITIONS: Record<AgentState, string> = {
 idle:'0% 0%', sleep:'100% 0%', thinking:'0% 100%', stuck:'100% 100%',
};
/** A two-by-two sheet, in reading order: idle, sleep, thinking, stuck. */
export function AgentAvatar({character='worm',state='idle',size=32,label,className=''}:{character?:AgentCharacter;state?:AgentState;size?:number;label?:string;className?:string}) {
 const identity = useSyncExternalStore(subscribe, () => label ? identities.get(label) : undefined, () => undefined);
 character = identity?.character ?? character;
 state = identity?.state ?? state;
 const style:CSSProperties={width:size,height:size,backgroundImage:`url(/agents/${character}.png)`,backgroundPosition:POSITIONS[state],backgroundSize:'200% 200%'};
 // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A CSS sprite exposes one cropped state as an accessible image.
 return <span role="img" aria-label={label??`${character} · ${state}`} data-agent-character={character} data-agent-state={state} className={`agent-sprite ${className}`} style={style}/>;
}
