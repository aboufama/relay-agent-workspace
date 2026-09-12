// OpenClaw 2026.7.1 HTTP completions can finish before subagent announcements.
// Read native history outside the model loop until the parent has joined results.
export async function readNativeHistory({ baseUrl, token, sessionKey, signal }) {
  const url = `${baseUrl.replace(/\/$/, '')}/sessions/${encodeURIComponent(sessionKey)}/history?limit=1000`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: signal ?? AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return { messages: [] };
  if (!response.ok) throw new Error(`Native session history failed: HTTP ${response.status}`);
  return response.json();
}

const textOf = message => typeof message.content === 'string' ? message.content
  : (message.content ?? []).filter(part => part.type === 'text').map(part => part.text).join('\n');
const recordedAt = message => message.__openclaw?.recordTimestampMs ?? message.timestamp ?? 0;
const isFinal = message => message.role === 'assistant' && message.stopReason === 'stop'
  && textOf(message).trim() && !['NO_REPLY', 'No response from OpenClaw.'].includes(textOf(message).trim());

export function acceptedChildren(messages) {
  const children = new Map();
  for (const message of messages) {
    if (message.role !== 'toolResult' || message.toolName !== 'sessions_spawn' || message.isError) continue;
    try {
      const result = JSON.parse(textOf(message));
      if (result.status === 'accepted' && result.childSessionKey && result.runId) {
        children.set(result.childSessionKey, { sessionKey: result.childSessionKey, runId: result.runId });
      }
    } catch { /* Other tool output is not a native accepted spawn record. */ }
  }
  return [...children.values()];
}

// Capture the parent's last __openclaw.seq BEFORE submitting the HTTP turn.
// The caller supplies the known canonical key agent:<nativeAgent>:shoal:<lowercase-key>.
export async function awaitNativeDelegation({ baseUrl, token, sessionKey, afterSeq, timeoutMs = 180_000, signal }) {
  if (!Number.isInteger(afterSeq) || afterSeq < 0) throw new Error('A pre-request native history sequence is required');
  const deadline = Date.now() + timeoutMs;
  const read = key => readNativeHistory({ baseUrl, token, sessionKey: key, signal });
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    const snapshot = await read(sessionKey);
    const messages = snapshot.messages.filter(message => (message.__openclaw?.seq ?? 0) > afterSeq);
    const children = acceptedChildren(messages);
    if (!children.length) return null;
    const childSnapshots = await Promise.all(children.map(child => read(child.sessionKey)));
    for (let index = 0; index < childSnapshots.length; index++) {
      const last = childSnapshots[index].messages.filter(message => message.role === 'assistant').at(-1);
      if (last && ['error', 'aborted'].includes(last.stopReason)) throw new Error(`Native worker ${children[index].sessionKey} ${last.stopReason}: ${textOf(last).slice(0, 300) || 'No completed result.'}`);
    }
    const finals = childSnapshots.map(snapshot => snapshot.messages.filter(isFinal).at(-1));
    const latestChild = finals.every(Boolean) ? Math.max(...finals.map(recordedAt)) : Infinity;
    const final = messages.filter(message => isFinal(message) && recordedAt(message) >= latestChild).at(-1);
    if (final) {
      const allMessages = [...messages, ...childSnapshots.flatMap(snapshot => snapshot.messages)];
      return {
        content: textOf(final),
        children: children.map((child, index) => ({ ...child, completedAt: recordedAt(finals[index]) })),
        completedAt: recordedAt(final),
        usage: allMessages.reduce((usage, message) => {
          if (message.role === 'assistant') {
            usage.prompt_tokens += message.usage?.input ?? 0;
            usage.completion_tokens += message.usage?.output ?? 0;
          }
          return usage;
        }, { prompt_tokens: 0, completion_tokens: 0 }),
      };
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error('Native children or their parent synthesis did not complete before the deadline');
}
