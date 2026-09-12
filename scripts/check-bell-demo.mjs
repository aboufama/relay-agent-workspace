#!/usr/bin/env node
// Read-only integration check against a running Bell demo (no runner or cloud service required).
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:5188';
async function request(path, body) {
  const response = await fetch(new URL(path, base), body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  assert.equal(response.ok, true, `${path}: HTTP ${response.status}`);
  return response.json();
}
const state = await request('/api/state');
assert.equal(state.members.filter(member => member.kind === 'agent' && member.data.demo).length, 6, 'six Bell specialists');
assert.equal(state.tasks.filter(task => task.id.startsWith('bell-')).length, 16, 'sixteen demo tasks');
assert.equal(state.documents.filter(doc => doc.id.startsWith('bell-')).length, 12, 'twelve searchable sources');
assert.equal(state.messages.filter(message => message.id.startsWith('bell-')).length, 20, 'twenty fictional conversation messages');
const expected = {
  atlas: ['doc-release-board', 'doc-horizon-qual', 'doc-summit-design', 'doc-compass-matrix', 'doc-compass-recovery', 'doc-fw27'],
  sage: ['doc-summit-brief', 'doc-cedar-public', 'doc-release-board', 'doc-horizon-qual'],
  nova: ['doc-summit-brief', 'doc-cedar-public', 'doc-release-board', 'doc-horizon-qual', 'doc-summit-design', 'doc-horizon-thermal', 'doc-cedar-bench'],
  iris: ['doc-summit-brief', 'doc-cedar-public', 'doc-release-board', 'doc-horizon-qual', 'doc-horizon-field', 'doc-compass-matrix', 'doc-compass-recovery'],
  scout: ['doc-summit-brief', 'doc-cedar-public'],
  ledger: ['doc-summit-brief', 'doc-cedar-public', 'doc-release-board', 'doc-horizon-qual', 'doc-summit-design', 'doc-horizon-thermal', 'doc-cedar-bench', 'doc-cedar-sourcing'],
};
for (const [agentId, ids] of Object.entries(expected)) {
  const member = state.members.find(member => member.id === agentId);
  assert.ok(member.data.goal && member.data.accessPaths.length && member.data.examplePrompts.length, `${agentId}: complete profile`);
  const { passages } = await request('/api/context', { query: 'Bell', agentId, k: 20 });
  assert.deepEqual([...new Set(passages.map(passage => passage.documentId))].sort(), ids.map(id => `bell-${id}`).sort(), `${agentId}: exact source access`);
  console.log(`${agentId}: ${ids.length} allowed documents; other collections excluded`);
}
const source = await fetch(new URL('/api/documents?id=bell-doc-cedar-sourcing', base));
assert.ok(source.ok);
assert.match(await source.text(), /\$918,800/);
const again = await request('/api/state');
assert.equal(again.documents.length, state.documents.length, 'loading does not duplicate the corpus');
assert.equal(again.messages.length, state.messages.length, 'loading does not duplicate conversations');
console.log('Bell demo: profiles, searchable sources, scoped access, stored bytes, and repeat-load checks passed.');
