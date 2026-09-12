import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, id, mapApproval, mapRun, now, ok, runnerAuthorized } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => JSON.stringify(k) + ':' + canonical(value)).join(',') + '}';
  return JSON.stringify(v);
}
export async function GET(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!runnerAuthorized(request, e)) return fail('Runner token required.', 401);
  await ensureSchema(e);
  const runId = new URL(request.url).searchParams.get('runId');
  const rows = runId
    ? await e.DB.prepare('SELECT * FROM approvals WHERE run_id=? ORDER BY created_at').bind(runId).all<Record<string, unknown>>()
    : await e.DB.prepare("SELECT * FROM approvals WHERE source='openclaw' AND receipt IS NULL ORDER BY created_at LIMIT 200").all<Record<string, unknown>>();
  return ok({ approvals: rows.results.map(mapApproval) });
}
export async function POST(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!runnerAuthorized(request, e)) return fail('Runner token required.', 401);
  await ensureSchema(e);
  const p = await body<{ source?: string; externalId?: string; sessionKey?: string; runId?: string; title?: string; body?: string; action?: unknown; expiresAt?: string }>(request);
  if (p?.source !== 'openclaw' || !p.externalId || !p.sessionKey || !p.action || !p.expiresAt || !Number.isFinite(Date.parse(p.expiresAt))) return fail('A native approval requires its identity, session, exact action and expiry.');
  const action = canonical(p.action);
  if (action.length > 200000) return fail('Action is too large.');
  const existing = await e.DB.prepare("SELECT * FROM approvals WHERE source='openclaw' AND external_id=?").bind(p.externalId).first<Record<string, unknown>>();
  if (existing) return existing.action === action ? ok({ approval: mapApproval(existing) }) : fail('An approval identity cannot change its action.', 409);
  // OpenClaw prefixes custom HTTP sessions with the selected agent and lowercases the key.
  const run = await e.DB.prepare("SELECT * FROM runs WHERE ('agent:' || replace(model,'openclaw/','') || ':' || lower(json_extract(packet,'$.sessionKey')))=? ORDER BY created_at DESC LIMIT 1").bind(p.sessionKey.toLowerCase()).first<Record<string, unknown>>();
  if (p.runId && (!run || p.runId !== run.id)) return fail('Approval run does not match its session.', 409);
  const approvalId = id('apr'); const ts = now();
  await e.DB.prepare("INSERT INTO approvals(id,run_id,title,agent,body,action,status,level,created_at,source,external_id,session_key,expires_at,workflow) VALUES (?,?,?,?,?,?,'Pending','Internal',?,'openclaw',?,?,?,'Local command')")
    .bind(approvalId, run?.id ?? null, String(p.title || 'Approve local command').slice(0, 200), run?.agent_id ?? 'OpenClaw', String(p.body || ''), action, ts, p.externalId, p.sessionKey, p.expiresAt).run();
  if (run && ['running','awaiting'].includes(String(run.status))) {
    await e.DB.prepare("UPDATE runs SET status='awaiting' WHERE id=? AND status='running'").bind(run.id).run();
    await emit(e, 'run.updated', { run: { ...mapRun(run), status: 'awaiting' } });
  }
  const approval = mapApproval((await e.DB.prepare('SELECT * FROM approvals WHERE id=?').bind(approvalId).first<Record<string, unknown>>())!);
  await emit(e, 'approval.created', { approval });
  return ok({ approval });
}
