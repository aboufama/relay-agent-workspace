import { env } from 'cloudflare:workers';
import { getRuntimeStatus, type ChatRuntimeConfig } from '@/lib/chat-gateway';
export const dynamic = 'force-dynamic';
export function GET() {
  return getRuntimeStatus(env as ChatRuntimeConfig);
}
