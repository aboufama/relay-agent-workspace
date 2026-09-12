import { env } from 'cloudflare:workers';
import { computeSetup } from '@/lib/compute-setup';
import type { ChatRuntimeConfig } from '@/lib/chat-gateway';

export const dynamic = 'force-dynamic';
export function GET(request: Request) { return computeSetup(request, env as ChatRuntimeConfig); }
export function POST(request: Request) { return computeSetup(request, env as ChatRuntimeConfig); }
