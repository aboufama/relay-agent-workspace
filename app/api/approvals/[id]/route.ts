import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, mapApproval, now, ok, sameOrigin } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const { id } = await ctx.params;
  const p = await body<{ decision?: string; action?: string }>(request);
  const decision = p?.decision === 'Approved' ? 'Approved' : p?.decision === 'Rejected' ? 'Rejected' : null;
  if (!decision) return fail('Choose Approve or Reject.');
  const row = await e.DB.prepare('SELECT * FROM approvals WHERE id=?').bind(id).first<Record<string, unknown>>();
  if (!row) return fail('Approval not found.', 404);
  if (p?.action !== row.action) return fail('Review the exact current action before deciding.', 409);
  if (row.receipt || (row.expires_at && Date.parse(String(row.expires_at)) <= Date.now())) return fail('This command approval has expired or already settled.', 409);
  if (row.status !== 'Pending' && row.status !== decision) return fail('This approval already has a decision.', 409);
  await e.DB.prepare("UPDATE approvals SET status=?, decided_by='you', decided_at=? WHERE id=? AND status='Pending'").bind(decision, now(), id).run();
  const approval = mapApproval((await e.DB.prepare('SELECT * FROM approvals WHERE id=?').bind(id).first<Record<string, unknown>>())!);
  await emit(e, 'approval.updated', { approval });
  return ok({ approval });
}
