import { env } from 'cloudflare:workers';
import { computeSetup, type ComputeSetupConfig } from '@/lib/compute-setup';

export const dynamic = 'force-dynamic';
export function GET(request: Request) { return computeSetup(request, env as ComputeSetupConfig); }
export function POST(request: Request) { return computeSetup(request, env as ComputeSetupConfig); }
