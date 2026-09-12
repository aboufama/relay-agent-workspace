import { env } from 'cloudflare:workers';
import { createChatResponse, type ChatRuntimeConfig } from '@/lib/chat-gateway';
export const dynamic = 'force-dynamic';
export function POST(request: Request) {
  return createChatResponse(request, env as ChatRuntimeConfig);
}
