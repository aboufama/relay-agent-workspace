import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, mapTask, now, ok, sameOrigin } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const p = await body<Record<string, string>>(request);
  const title = String(p?.title ?? '').trim();
  if (!title) return fail('A task needs a title.');
  const t = { id: `SH-${crypto.randomUUID().slice(0, 8)}`, project: String(p?.project || 'launch'), title, description: String(p?.description ?? ''), status: String(p?.status || 'Backlog'), owner: String(p?.owner ?? ''), priority: String(p?.priority || 'Medium'), due: String(p?.due ?? ''), label: String(p?.label ?? ''), criteria: p?.criteria ? String(p.criteria) : null, created_at: now() };
  await e.DB.prepare("INSERT INTO tasks(id, project, title, description, status, owner, priority, due, label, comments, criteria, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)").bind(t.id, t.project, t.title, t.description, t.status, t.owner, t.priority, t.due, t.label, t.criteria, t.created_at).run();
  const row = await e.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(t.id).first<Record<string, unknown>>();
  const task = mapTask(row!);
  await emit(e, 'task.created', { task });
  return ok({ task });
}
