import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, mapMember, ok, sameOrigin } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
// Upsert an agent definition. Placement (which node runs it) belongs to a run, not the definition.
export async function POST(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const p = await body<Record<string, unknown>>(request);
  const id = (typeof p?.id === 'string' ? p.id : '').trim(); const name = (typeof p?.name === 'string' ? p.name : '').trim();
  if (!id || !name || name.length > 60) return fail('An agent needs an id and a name.');
  const { id: _id, name: _name, initials, tone, kind: _kind, ...data } = p as Record<string, unknown>;
  if (typeof data.instructions === 'string' && data.instructions.length > 20000) return fail('Instructions are too long.');
  const existing = await e.DB.prepare("SELECT kind, data FROM members WHERE id = ?").bind(id).first<{ kind: string; data: string }>();
  if (existing && existing.kind !== 'agent') return fail('Human profiles cannot be replaced by agents.', 409);
  const duplicate = await e.DB.prepare('SELECT id FROM members WHERE lower(name) = lower(?) AND id != ?').bind(name, id).first();
  if (duplicate) return fail('A workspace member already has this name.', 409);
  const previous = existing ? JSON.parse(existing.data) : {};
  const mergedData = { ...previous, ...data, createdAt: previous.createdAt ?? Date.now() };
  await e.DB.prepare("INSERT INTO members(id, kind, name, initials, tone, data) VALUES (?, 'agent', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, initials = excluded.initials, tone = excluded.tone, data = excluded.data")
    .bind(id, name, typeof initials === 'string' ? initials : name.slice(0, 2).toUpperCase(), typeof tone === 'string' ? tone : null, JSON.stringify(mergedData)).run();
  const member = mapMember((await e.DB.prepare('SELECT * FROM members WHERE id = ?').bind(id).first<Record<string, unknown>>())!);
  await emit(e, 'member.updated', { member });
  return ok({ member });
}

export async function DELETE(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const id = new URL(request.url).searchParams.get('id');
  const existing = id ? await e.DB.prepare("SELECT id FROM members WHERE id = ? AND kind = 'agent'").bind(id).first() : null;
  if (!existing) return fail('Agent not found.', 404);
  const active = await e.DB.prepare("SELECT id FROM runs WHERE agent_id = ? AND status IN ('queued','preparing','running','awaiting') LIMIT 1").bind(id).first();
  if (active) return fail('Wait for this agent’s current work to finish before deleting it.', 409);
  await e.DB.prepare("DELETE FROM members WHERE id = ? AND kind = 'agent'").bind(id).run();
  await emit(e, 'member.deleted', { id });
  return ok({ ok: true });
}
