import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, ensureSchema, fail, ok, sameOrigin } from '@/lib/buzz/db';
import { agentLevel, getAgent, retrieve } from '@/lib/buzz/context';
export const dynamic = 'force-dynamic';
// Scoped retrieval for the context inspector and, later, for worker tools.
export async function POST(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const p = await body<{ query?: string; agentId?: string; k?: number }>(request);
  const query = String(p?.query ?? '').trim();
  if (!query) return fail('Missing query.');
  const agent = p?.agentId ? await getAgent(e, p.agentId) : null;
  if (p?.agentId && !agent) return fail('Agent not found.', 404);
  const passages = await retrieve(e, query, agent ? agentLevel(agent) : 'Restricted', Math.max(1, Math.min(Number(p?.k) || 6, 20)), agent);
  return ok({ passages });
}
