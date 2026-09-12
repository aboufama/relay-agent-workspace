import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, mapApproval, mapRun, now, ok, runnerAuthorized } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const e = env as unknown as BuzzEnv;
  if (!runnerAuthorized(request, e)) return fail('Runner token required.', 401);
  await ensureSchema(e); const { id } = await ctx.params;
  const p = await body<{ decision?: string; status?: string; result?: unknown }>(request);
  if (!p?.status || !['resolved','expired','failed'].includes(p.status)) return fail('Invalid native receipt.');
  const row = await e.DB.prepare('SELECT * FROM approvals WHERE id=?').bind(id).first<Record<string, unknown>>();
  if (!row) return fail('Approval not found.', 404);
  if (p.status === 'resolved' && ((p.decision === 'allow-once' && row.status !== 'Approved') || (p.decision === 'deny' && row.status !== 'Rejected') || !['allow-once','deny'].includes(p.decision || ''))) return fail('Native decision does not match the human decision.', 409);
  if (row.receipt) return ok({ approval: mapApproval(row) });
  const receipt = { ...p, recordedAt: now(), meaning: 'Native decision receipt; command completion is recorded separately.' };
  await e.DB.prepare("UPDATE approvals SET receipt=?, status=CASE WHEN status='Pending' THEN 'Rejected' ELSE status END WHERE id=? AND receipt IS NULL").bind(JSON.stringify(receipt), id).run();
  const approval = mapApproval((await e.DB.prepare('SELECT * FROM approvals WHERE id=?').bind(id).first<Record<string, unknown>>())!);
  await emit(e, 'approval.updated', { approval });
  if (row.run_id) {
    await e.DB.prepare('INSERT INTO run_events(run_id,type,payload,ts) VALUES (?,?,?,?)').bind(row.run_id, 'approval.receipt', JSON.stringify({ approvalId: id, ...receipt }), now()).run();
    await e.DB.prepare("UPDATE runs SET status='running' WHERE id=? AND status='awaiting' AND NOT EXISTS(SELECT 1 FROM approvals WHERE run_id=? AND status='Pending' AND receipt IS NULL)").bind(row.run_id, row.run_id).run();
    const run = await e.DB.prepare('SELECT * FROM runs WHERE id=?').bind(row.run_id).first<Record<string, unknown>>();
    if (run) await emit(e, 'run.updated', { run: mapRun(run) });
  }
  return ok({ approval });
}
