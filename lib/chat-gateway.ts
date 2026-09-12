export type ChatRuntimeConfig = {
  GB10_CHAT_URL?: string;
  GB10_API_KEY?: string;
  GB10_MODEL?: string;
  CLOUD_CHAT_URL?: string;
  CLOUD_API_KEY?: string;
  CLOUD_MODEL?: string;
  CLOUD_HOME_ID?: string;
};
type ChatMessage = { role: 'user' | 'assistant'; content: string };
function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function configuredURL(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url;
  } catch { /* Invalid runtime settings remain unavailable. */ }
  return null;
}
export async function createChatResponse(request: Request, config: ChatRuntimeConfig): Promise<Response> {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return error('This request must come from your workspace.', 403);
  if (Number(request.headers.get('Content-Length') || 0) > 250000) return error('This conversation is too long. Start a new message.', 413);
  let payload: unknown;
  try {
    const body = await request.text();
    if (body.length > 250000) return error('This conversation is too long. Start a new message.', 413);
    payload = JSON.parse(body);
  } catch { return error('The message could not be read.', 400); }
  if (!object(payload) || !object(payload.agent) || !Array.isArray(payload.messages)) return error('Choose an agent and send a message.', 400);
  const agent = payload.agent;
  if (typeof payload.agentId !== 'string' || payload.agentId !== agent.id ||
      typeof agent.name !== 'string' || !agent.name.trim() || agent.name.length > 60 ||
      typeof agent.instructions !== 'string' || agent.instructions.length > 20000 ||
      !['local', 'cloud'].includes(String(agent.runtime))) return error('The agent configuration is invalid.', 400);
  if (!payload.messages.length || payload.messages.length > 40) return error('Send between 1 and 40 conversation messages.', 400);
  const messages: ChatMessage[] = [];
  let length = 0;
  for (const item of payload.messages) {
    if (!object(item) || !['user', 'assistant'].includes(String(item.role)) || typeof item.content !== 'string' || item.content.length > 30000) return error('A conversation message is invalid.', 400);
    length += item.content.length;
    messages.push({ role: item.role as ChatMessage['role'], content: item.content });
  }
  if (length > 60000) return error('This conversation is too long for the connected model. Start a new conversation.', 413);
  const local = agent.runtime === 'local';
  if (local ? agent.homeId !== 'lab' : agent.homeId !== (config.CLOUD_HOME_ID || 'openai-preview')) {
    return error('This agent’s home is not connected. Choose a connected home in agent settings.', 503);
  }
  const url = configuredURL(local ? config.GB10_CHAT_URL : config.CLOUD_CHAT_URL);
  const key = local ? config.GB10_API_KEY : config.CLOUD_API_KEY;
  const model = local ? config.GB10_MODEL || 'holo' : config.CLOUD_MODEL;
  if (!url || !key || !model) return error(local ? 'The Dell model is still starting. Retry once its home shows connected.' : 'This cloud home is not connected yet.', 503);
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(115000)]),
      body: JSON.stringify({
        model, stream: true, max_tokens: 1024, temperature: 0.6,
        messages: [{ role: 'system', content: `You are ${agent.name}, a member of a team workspace. Answer the conversation directly and concisely. You only have the messages provided here; do not claim to have read company files, taken actions, or contacted anyone.\n\nAgent instructions:\n${agent.instructions}` }, ...messages],
      }),
    });
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel();
      if (upstream.status === 429) return error('This agent is busy. Try again in a moment.', 429);
      return error(local ? 'The Dell model is not ready to respond yet. Please retry.' : 'The cloud connection could not complete this request.', 503);
    }
    return new Response(upstream.body, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return error(request.signal.aborted ? 'Response stopped.' : 'The agent’s home could not be reached. Please retry.', request.signal.aborted ? 499 : 504);
  }
}
export async function getRuntimeStatus(config: ChatRuntimeConfig): Promise<Response> {
  const chat = configuredURL(config.GB10_CHAT_URL);
  let connected = false;
  if (chat && config.GB10_API_KEY) {
    try {
      const response = await fetch(new URL('/v1/models', chat), {
        headers: { Authorization: `Bearer ${config.GB10_API_KEY}` }, signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const data: unknown = await response.json();
        connected = object(data) && Array.isArray(data.data) && data.data.some((item: unknown) => object(item) && item.id === (config.GB10_MODEL || 'holo'));
      } else await response.body?.cancel();
    } catch { /* Not ready, offline or unreachable. */ }
  }
  return Response.json({ homes: [{ id: 'lab', name: 'Dell GB10', connected, model: config.GB10_MODEL || 'holo' }] }, { headers: { 'Cache-Control': 'no-store' } });
}
