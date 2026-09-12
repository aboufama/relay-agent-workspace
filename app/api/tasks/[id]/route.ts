import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, mapTask, ok, sameOrigin } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
const FIELDS = ['status', 'owner', 'priority', 'due', 'label', 'title', 'description', 'deliverable', 'criteria'] as const;
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const { id } = await ctx.params;
  const p = await body<Record<string, unknown>>(request);
  if (!p) return fail('Nothing to update.');
  const row = await e.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!row) return fail('Task not found.', 404);
  const sets: string[] = []; const values: unknown[] = [];
  for (const f of FIELDS) if (typeof p[f] === 'string') { sets.push(`${f} = ?`); values.push(p[f]); }
  if (typeof p.comment === 'string' && p.comment.trim()) {
    const comments = JSON.parse(typeof row.comments === 'string' ? row.comments : '[]') as string[];
    comments.push(p.comment.trim()); sets.push('comments = ?'); values.push(JSON.stringify(comments));
  }
  if (!sets.length) return fail('Nothing to update.');
  await e.DB.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  const task = mapTask((await e.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<Record<string, unknown>>())!);
  await emit(e, 'task.updated', { task });
  return ok({ task });
}
