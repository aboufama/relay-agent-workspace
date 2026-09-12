import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, id, mapMember, mapMessage, mapRun, now, ok, sameOrigin } from '@/lib/buzz/db';
import type { MemberRecord, RunMode } from '@/lib/buzz/types';
import { canUseContextRoom, resolveContextRoom } from '@/lib/buzz/context-scope';
export const dynamic = 'force-dynamic';

function mentioned(text: string, name: string): boolean {
  return text.toLowerCase().split(`@${name.toLowerCase()}`).slice(1).some((tail) => !tail || /^[\s.,!?;:]/.test(tail));
}
export async function POST(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('This request must come from your workspace.', 403);
  await ensureSchema(e);
  const p = await body<{ room?: string; text?: string; clientId?: string; mode?: RunMode }>(request);
  const text = String(p?.text ?? '').trim(); const room = String(p?.room ?? '').trim();
  if (!text || !room || text.length > 30000 || room.length > 160) return fail('Write a message of at most 30,000 characters.');
  if (p?.mode && !['quick', 'deep'].includes(p.mode)) return fail('Choose Quick or Deep.');
  const mode = p?.mode ?? 'quick';
  // The local demonstration has one operator, authenticated by SSH. Identity is not client supplied.
  const memberId = 'you';
  const member = await e.DB.prepare('SELECT * FROM members WHERE id = ?').bind(memberId).first<Record<string, unknown>>();
  const clientId = typeof p?.clientId === 'string' ? p.clientId.slice(0, 80) : id('client');
  const existing = await e.DB.prepare('SELECT * FROM messages WHERE client_id = ?').bind(clientId).first<Record<string, unknown>>();
  if (existing) {
    const runs = await e.DB.prepare('SELECT id FROM runs WHERE trigger_message_id = ?').bind(existing.id).all<{ id: string }>();
    return ok({ message: mapMessage(existing), runs: runs.results.map((r) => r.id) });
  }
  const rows = await e.DB.prepare("SELECT * FROM members WHERE kind = 'agent'").all<Record<string, unknown>>();
  const agents = rows.results.map(mapMember).filter((a: MemberRecord) => !a.data.paused && (room === `dm:${a.id}` || mentioned(text, a.name)));
  const scopeRoom = await resolveContextRoom(e, room).catch(() => null);
  if (!scopeRoom) return fail('Conversation thread not found.', 404);
  const denied = agents.filter(agent => !canUseContextRoom(agent, scopeRoom));
  if (denied.length) return fail(`${denied.map(agent => agent.name).join(', ')} cannot access this conversation. Use an authorized room or send an explicitly scoped direct message.`, 403);
  const ts = now(); const triggerId = id('msg');
  const pending = agents.map((a) => ({ agent: a, replyId: id('msg'), runId: id('run') }));
  const stmts = [e.DB.prepare('INSERT INTO messages(id, room, member_id, name, body, created_at, state, client_id) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)').bind(triggerId, room, memberId, String(member?.name || 'You'), text, ts, clientId)];
  if (!room.startsWith('dm:') && !room.startsWith('thread:')) stmts.push(e.DB.prepare('INSERT OR IGNORE INTO channels(name, created_at) VALUES (?, ?)').bind(room, ts));
  for (const { agent, replyId, runId } of pending) stmts.push(
    e.DB.prepare("INSERT INTO messages(id, room, member_id, name, body, created_at, run_id, state) VALUES (?, ?, ?, ?, '', ?, ?, 'pending')").bind(replyId, room, agent.id, agent.name, ts, runId),
    e.DB.prepare("INSERT INTO runs(id, kind, agent_id, room, message_id, trigger_message_id, status, backend, mode, created_at) VALUES (?, 'chat', ?, ?, ?, ?, 'queued', 'openclaw', ?, ?)").bind(runId, agent.id, room, replyId, triggerId, mode, ts),
  );
  try { await e.DB.batch(stmts); } catch (error) {
    const duplicate = await e.DB.prepare('SELECT * FROM messages WHERE client_id = ?').bind(clientId).first<Record<string, unknown>>();
    if (duplicate) return ok({ message: mapMessage(duplicate), runs: [] });
    throw error;
  }
  const message = { id: triggerId, room, memberId, name: String(member?.name || 'You'), body: text, createdAt: ts, state: null };
  await emit(e, 'message.created', { message });
  for (const { agent, replyId, runId } of pending) {
    await emit(e, 'message.created', { message: { id: replyId, room, memberId: agent.id, name: agent.name, body: '', createdAt: ts, runId, state: 'pending' } });
    await emit(e, 'run.queued', { run: mapRun((await e.DB.prepare('SELECT * FROM runs WHERE id = ?').bind(runId).first<Record<string, unknown>>())!) });
  }
  return ok({ message, runs: pending.map((p) => p.runId) });
}
