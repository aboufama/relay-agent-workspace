import { env } from 'cloudflare:workers';
import { type BuzzEnv, body, emit, ensureSchema, fail, id, mapDocument, now, ok, sameOrigin } from '@/lib/buzz/db';
import { chunkText, embed } from '@/lib/buzz/context';
import { LEVELS, type Level } from '@/lib/buzz/types';
export const dynamic = 'force-dynamic';

const formText = (value: FormDataEntryValue | null, fallback = '') => typeof value === 'string' ? value : fallback;
const TEXT_TYPES = /^(text\/|application\/(json|xml|x-yaml|yaml|javascript|typescript))/;
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|yaml|yml|log|py|ts|tsx|js|mjs|html|css|sql|sh|toml|ini|cfg|rst)$/i;

// POST multipart: file, collection, level, owner, audiences (JSON), agents (JSON). Ingestion is synchronous and local.
export async function POST(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail('Choose a file to import.');
  if (file.size > 25 * 1024 * 1024) return fail('Files over 25 MB are not supported yet.', 413);
  const level = (LEVELS.includes(formText(form!.get('level')) as Level) ? formText(form!.get('level')) : 'Internal') as Level;
  const parse = (v: FormDataEntryValue | null) => { try { const x = JSON.parse(formText(v, '[]')); return Array.isArray(x) ? x.map(String) : []; } catch { return []; } };
  const doc = { id: id('doc'), name: file.name.slice(0, 200), type: file.type || 'application/octet-stream', size: file.size, collection: formText(form!.get('collection'), 'Company').slice(0, 80), level, owner: 'you', audiences: parse(form!.get('audiences')), agents: parse(form!.get('agents')), r2_key: '' };
  const agents = await e.DB.prepare("SELECT id, data FROM members WHERE kind='agent'").all<{ id: string; data: string }>();
  if (doc.agents.some((id) => !agents.results.some((a) => a.id === id))) return fail('Choose current workspace agents for document access.');
  if (doc.agents.some(id => { const member = agents.results.find(a => a.id === id)!; const data = JSON.parse(member.data); return LEVELS.indexOf(data.accessLevel) < LEVELS.indexOf(level) || (LEVELS.indexOf(level) >= 2 && data.runtime === 'cloud'); })) return fail('A selected agent does not have access at this level.');
  if (level === 'Restricted' && !doc.agents.length) return fail('Restricted documents require at least one named agent.');
  doc.r2_key = `documents/${doc.id}/${doc.name}`;
  const bytes = await file.arrayBuffer();
  await e.BUCKET.put(doc.r2_key, bytes, { httpMetadata: { contentType: doc.type } });
  await e.DB.prepare("INSERT INTO documents(id, name, type, size, collection, level, owner, audiences, agents, status, updated_at, r2_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'extracting', ?, ?)")
    .bind(doc.id, doc.name, doc.type, doc.size, doc.collection, doc.level, doc.owner, JSON.stringify(doc.audiences), JSON.stringify(doc.agents), now(), doc.r2_key).run();
  await emit(e, 'document.created', { document: mapDocument((await e.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(doc.id).first<Record<string, unknown>>())!) });

  let text = '';
  let error: string | null = null;
  if (TEXT_TYPES.test(doc.type) || TEXT_EXT.test(doc.name)) text = new TextDecoder().decode(bytes);
  else error = `No local extractor for ${doc.type || 'this file type'} yet. The file is stored; it is not searchable.`; // ponytail: PDF/DOCX extraction lands with a local extractor container.
  let status: 'ready' | 'failed' = 'ready';
  let chunkCount = 0;
  if (error) status = 'failed';
  else {
    const chunks = chunkText(text);
    chunkCount = chunks.length;
    await e.DB.prepare("UPDATE documents SET status = 'indexing', text_chars = ? WHERE id = ?").bind(text.length, doc.id).run();
    for (let i = 0; i < chunks.length; i += 32) {
      const batch = chunks.slice(i, i + 32);
      const vectors = await embed(e, batch);
      if (!vectors) error = 'Keyword search only: the embedding service was unavailable during import.';
      const stmts = batch.flatMap((t, j) => {
        const cid = `${doc.id}:${i + j}`;
        return [
          e.DB.prepare('INSERT INTO chunks(id, document_id, idx, text, embedding) VALUES (?, ?, ?, ?, ?)').bind(cid, doc.id, i + j, t, vectors ? JSON.stringify(vectors[j]) : null),
          e.DB.prepare('INSERT INTO chunks_fts(chunk_id, document_id, text) VALUES (?, ?, ?)').bind(cid, doc.id, t),
        ];
      });
      if (stmts.length) await e.DB.batch(stmts);
    }
  }
  await e.DB.prepare('UPDATE documents SET status = ?, chunk_count = ?, error = ?, updated_at = ? WHERE id = ?').bind(status, chunkCount, error, now(), doc.id).run();
  const document = mapDocument((await e.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(doc.id).first<Record<string, unknown>>())!);
  await emit(e, 'document.updated', { document });
  return ok({ document });
}

// GET ?id=… → original bytes (preview/download). DELETE ?id=… → remove document, chunks, index, and bytes.
export async function GET(request: Request) {
  const e = env as unknown as BuzzEnv;
  await ensureSchema(e);
  const docId = new URL(request.url).searchParams.get('id');
  const row = docId ? await e.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(docId).first<Record<string, unknown>>() : null;
  if (!row) return fail('Document not found.', 404);
  const object = await e.BUCKET.get(typeof row.r2_key === 'string' ? row.r2_key : '');
  if (!object) return fail('Stored bytes are missing.', 404);
  return new Response(object.body, { headers: { 'Content-Type': String(row.type), 'Content-Disposition': `${new URL(request.url).searchParams.get('preview') === '1' ? 'inline' : 'attachment'}; filename="${String(row.name).replace(/"/g, '')}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox" } });
}
export async function DELETE(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const docId = new URL(request.url).searchParams.get('id');
  const row = docId ? await e.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(docId).first<Record<string, unknown>>() : null;
  if (!row) return fail('Document not found.', 404);
  await e.DB.batch([
    e.DB.prepare('DELETE FROM chunks_fts WHERE document_id = ?').bind(docId),
    e.DB.prepare('DELETE FROM chunks WHERE document_id = ?').bind(docId),
    e.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docId),
  ]);
  if (row.r2_key) await e.BUCKET.delete(typeof row.r2_key === 'string' ? row.r2_key : '');
  await emit(e, 'document.deleted', { id: docId });
  return ok({ ok: true });
}

// Update classification and named access without replacing stored bytes or the search index.
export async function PATCH(request: Request) {
  const e = env as unknown as BuzzEnv;
  if (!sameOrigin(request)) return fail('Forbidden', 403);
  await ensureSchema(e);
  const input = await body<{ id?: string; level?: Level; collection?: string; audiences?: string[]; agents?: string[] }>(request);
  if (!input?.id) return fail('Choose a document.');
  const row = await e.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(input.id).first<Record<string, unknown>>();
  if (!row) return fail('Document not found.', 404);
  const current = mapDocument(row);
  const level = input.level ?? current.level;
  if (!LEVELS.includes(level)) return fail('Choose a valid classification.');
  const validList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 100 && v.every(x => typeof x === 'string' && x.length <= 300);
  if (input.agents !== undefined && !validList(input.agents)) return fail('Choose valid agent grants.');
  if (input.audiences !== undefined && !validList(input.audiences)) return fail('Choose valid audiences.');
  const agents = [...new Set(input.agents ?? current.agents)];
  const audiences = [...new Set(input.audiences ?? current.audiences)];
  const collection = input.collection === undefined ? current.collection : String(input.collection).trim().slice(0, 80);
  if (!collection) return fail('Choose a collection.');
  const members = await e.DB.prepare("SELECT id, data FROM members WHERE kind = 'agent'").all<{ id: string; data: string }>();
  for (const id of agents) {
    const member = members.results.find(a => a.id === id);
    if (!member) return fail('Choose current workspace agents.');
    const data = JSON.parse(member.data);
    if (LEVELS.indexOf(data.accessLevel) < LEVELS.indexOf(level) || (LEVELS.indexOf(level) >= 2 && data.runtime === 'cloud')) return fail('A selected agent does not have access at this level.');
  }
  if (level === 'Restricted' && !agents.length) return fail('Restricted sources need at least one named agent.');
  await e.DB.prepare('UPDATE documents SET level = ?, collection = ?, audiences = ?, agents = ?, updated_at = ? WHERE id = ?').bind(level, collection, JSON.stringify(audiences), JSON.stringify(agents), now(), input.id).run();
  const updated = mapDocument((await e.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(input.id).first<Record<string, unknown>>())!);
  await emit(e, 'document.updated', { document: updated });
  return ok({ document: updated });
}
