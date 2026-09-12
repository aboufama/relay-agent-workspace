import demo from './bell-demo.json';
import { LEVELS, type Level, type MemberRecord } from './types';
import type { BuzzEnv } from './db';

// A thread has the same audience as the conversation containing its root message.
export async function resolveContextRoom(env: BuzzEnv, room?: string | null): Promise<string | null> {
  let current = room ?? null;
  const seen = new Set<string>();
  while (current?.startsWith('thread:')) {
    if (seen.has(current) || seen.size >= 8) throw new Error('Invalid conversation thread.');
    seen.add(current);
    const parent = await env.DB.prepare('SELECT room FROM messages WHERE id = ?').bind(current.slice(7)).first<{ room: string }>();
    if (!parent) throw new Error('Conversation thread not found.');
    current = parent.room;
  }
  return current;
}

export function roomLevel(room: string | null): Level | null {
  return (demo.channels.find(channel => channel.name === room)?.classification as Level | undefined) ?? null;
}

export function canUseContextRoom(agent: MemberRecord, room: string | null): boolean {
  const level = roomLevel(room);
  if (!level) return true; // Operator-created rooms and explicit DM requests retain their existing behavior.
  const clearance = LEVELS.includes(agent.data.accessLevel as Level) ? agent.data.accessLevel as Level : 'Internal';
  return LEVELS.indexOf(clearance) >= LEVELS.indexOf(level)
    && Array.isArray(agent.data.channels) && agent.data.channels.includes(room);
}

export function canUseTaskContext(agent: MemberRecord, taskId: string | null): boolean {
  if (!demo.tasks.some(task => `bell-${task.id}` === taskId)) return true;
  // The seeded profile's allowlist protects stored Bell briefs and discussion.
  // New operator-authored tasks and custom profiles remain explicitly assignable.
  return !Array.isArray(agent.data.allowedTaskIds) || agent.data.allowedTaskIds.includes(taskId);
}

export function canReadHistoryMessage(agent: MemberRecord, room: string | null, memberId: string): boolean {
  if (!room?.startsWith('dm:')) return true;
  return room === `dm:${agent.id}` && (memberId === 'you' || memberId === agent.id);
}
