import { env } from 'cloudflare:workers';
import { type BuzzEnv, loadState, ok } from '@/lib/buzz/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  return ok(await loadState(env as unknown as BuzzEnv));
}
