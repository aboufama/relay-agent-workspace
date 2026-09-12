import { type BuzzEnv, emit, mapMessage, mapRun, now } from './db';
export async function failRun(e: BuzzEnv, runId: string, error: string) {
  await e.DB.batch([
    e.DB.prepare("UPDATE runs SET status = 'failed', error = ?, ended_at = ?, lease_until = NULL WHERE id = ? AND status NOT IN ('completed','cancelled')").bind(error, now(), runId),
    e.DB.prepare("UPDATE messages SET state = 'error', error = ? WHERE run_id = ? AND state != 'complete'").bind(error, runId),
  ]);
  const row = await e.DB.prepare('SELECT * FROM runs WHERE id = ?').bind(runId).first<Record<string, unknown>>();
  const message = await e.DB.prepare('SELECT * FROM messages WHERE run_id = ?').bind(runId).first<Record<string, unknown>>();
  if (message) await emit(e, 'message.updated', { message: mapMessage(message) });
  await emit(e, 'run.failed', { run: row ? mapRun(row) : undefined, runId, error });
}
export const leaseUntil = () => new Date(Date.now() + 120000).toISOString();
