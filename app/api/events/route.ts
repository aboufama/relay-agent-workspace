import { env } from 'cloudflare:workers';
import { type BuzzEnv, ensureSchema, eventsAfter, ok } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const e = env as unknown as BuzzEnv;
  await ensureSchema(e);
  const after = Number(new URL(request.url).searchParams.get('after') || 0);
  const events = await eventsAfter(e, Number.isFinite(after) ? after : 0);
  return ok({ events, cursor: events.length ? events[events.length - 1].seq : after });
}
