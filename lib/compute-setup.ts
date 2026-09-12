export type ComputeSetupConfig = { GB10_CHAT_URL?: string; GB10_API_KEY?: string };

const model = 'Holo-3.1-35B-A3B · NVFP4';
const phases = ['not_installed', 'downloading', 'installing', 'starting', 'ready', 'error'];
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

// The client can start only the fixed, idempotent installation on its configured
// Dell. Commands, addresses, credentials, and models never come from the request.
export async function computeSetup(request: Request, config: ComputeSetupConfig): Promise<Response> {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return response({ error: 'Open setup from your workspace.' }, 403);
  if (!config.GB10_CHAT_URL || !config.GB10_API_KEY) return response({ error: 'The Dell setup service is not connected.' }, 503);
  let url: URL;
  try {
    url = new URL('/relay/setup', config.GB10_CHAT_URL);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Invalid address');
  } catch { return response({ error: 'The Dell setup service is not connected.' }, 503); }
  try {
    const upstream = await fetch(url, {
      method: request.method === 'POST' ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${config.GB10_API_KEY}`, Accept: 'application/json' },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return response({ error: 'Unable to reach the Dell setup service. Try again.' }, 503);
    }
    const data: unknown = await upstream.json();
    if (!data || typeof data !== 'object' || !('phase' in data) || !phases.includes(String(data.phase))) return response({ error: 'Setup returned an invalid status. Try again.' }, 502);
    const value = data as Record<string, unknown>;
    const finite = (key: string) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0 ? value[key] as number : undefined;
    const text = (key: string) => typeof value[key] === 'string' ? (value[key] as string).slice(0, 1500) : undefined;
    // Raw installer logs may contain infrastructure details. Only expose the
    // bounded status fields intended for the workspace interface.
    return response({ phase: value.phase, model, progress: finite('progress') === undefined ? undefined : Math.min(100, finite('progress')!), downloaded: finite('downloaded'), total: finite('total'), message: text('message'), error: text('error') });
  } catch { return response({ error: 'The Dell setup service could not be reached. Try again.' }, 504); }
}
