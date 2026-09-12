import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, mapMember, ok, sameOrigin } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
// Upsert an agent definition. Placement (which node runs it) belongs to a run, not the definition.
export async function POST(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const p = await body<Record<string, unknown>>(request);
  const id = String(p?.id ?? '').trim(); const name = String(p?.name ?? '').trim();
  if (!id || !name || name.length > 60) return fail('An agent needs an id and a name.');
  const { id: _id, name: _name, initials, tone, kind: _kind, ...data } = p as Record<string, unknown>;
  if (typeof data.instructions === 'string' && data.instructions.length > 20000) return fail('Instructions are too long.');
  const existing = await e.DB.prepare("SELECT data FROM members WHERE id = ? AND kind = 'agent'").bind(id).first<{ data: string }>();
  const mergedData = { ...(existing ? JSON.parse(existing.data) : {}), ...data };
  await e.DB.prepare("INSERT INTO members(id, kind, name, initials, tone, data) VALUES (?, 'agent', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, initials = excluded.initials, tone = excluded.tone, data = excluded.data")
    .bind(id, name, String(initials || name.slice(0, 2).toUpperCase()), tone ? String(tone) : null, JSON.stringify(mergedData)).run();
  const member = mapMember((await e.DB.prepare('SELECT * FROM members WHERE id = ?').bind(id).first<Record<string, unknown>>())!);
  await emit(e, 'member.updated', { member });
  return ok({ member });
}
