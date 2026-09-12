import snapshot from './bell-state.json';
import { makeReplaySeekCheckpoint, restoreReplaySeekUI } from './replay-seek';
import corpus from '@/lib/buzz/bell-demo.json';
import { refresh } from '@/lib/buzz/store';
import type {
  WorkspaceState,
  MessageRecord,
  DocumentRecord,
  MemberRecord,
} from '@/lib/buzz/types';

const prompt = '@Ledger review Cedar’s vendor allocation and launch exposure.';
const recall = '@Ledger where were we on the vendor review?';
const answer =
  '2,600 of 4,000 servers are covered. The remaining 1,400 depend on PSU-B qualification.\n\nConditional plan: $918,800 — $25,200 below all-A. Marcus owns the retest; Orion approves spend.\n\nSource: [launch-allocation.md §1]';
const resumed =
  'Right where we left off: $918,800 conditional plan; 1,400 systems awaiting PSU-B qualification. Marcus owns the retest. No orders placed.\n\nSource: [launch-allocation.md §1]';
const stamp = '2026-09-12T14:30:00.000Z';
const newMessage = (
  id: string,
  body: string,
  agent = false,
): MessageRecord => ({
  id,
  body,
  room: 'cedar-sourcing',
  memberId: agent ? 'ledger' : 'you',
  name: agent ? 'Ledger' : 'Orion',
  createdAt: stamp,
  state: 'complete',
});
const visible = (node: Element) => !!(node as HTMLElement).offsetParent;
const button = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) =>
      visible(node) &&
      (node.textContent?.trim() === text ||
        node.getAttribute('aria-label') === text),
  );
let pointerTimer: ReturnType<typeof setTimeout> | undefined;
function point(node: Element) {
  let pointer = document.querySelector<HTMLElement>('[data-demo-cursor]');
  if (!pointer) {
    pointer = document.createElement('div');
    pointer.dataset.demoCursor = '';
    pointer.setAttribute('aria-hidden', 'true');
    pointer.innerHTML =
      '<svg width="25" height="30" viewBox="0 0 25 30"><path d="M3 2L21 17L12 18L8 26Z" fill="white" stroke="#37443b" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    Object.assign(pointer.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 2px 2px #0003)',
      transition: 'transform 260ms cubic-bezier(.2,0,.2,1),opacity 200ms',
    });
    document.body.appendChild(pointer);
  }
  const r = node.getBoundingClientRect();
  pointer.style.opacity = '1';
  pointer.style.transform = `translate(${r.left + r.width * 0.7}px,${r.top + r.height * 0.6}px)`;
  if (pointerTimer) clearTimeout(pointerTimer);
  pointerTimer = setTimeout(() => {
    pointer!.style.opacity = '0';
  }, 1100);
  return pointer;
}
const click = (text: string) => {
  const node = button(text);
  if (node) {
    node.scrollIntoView({ block: 'nearest' });
    point(node);
    setTimeout(() => {
      if (node.isConnected) node.click();
    }, 280);
  }
};
function fillField(label: string, text: string) {
  const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[aria-label="${label}"]`,
  );
  if (!field) return;
  const proto =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, text);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}
async function dragSource() {
  const source = document
    .querySelector<HTMLElement>(
      '[aria-label="View details for cedar-power-goals.md"]',
    )
    ?.closest<HTMLElement>('[draggable]');
  if (!source) return;
  const from = source.getBoundingClientRect();
  const transfer = new DataTransfer();
  source.dispatchEvent(
    new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }),
  );
  const ghost = source.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    transform: 'none',
    zIndex: '99999',
    pointerEvents: 'none',
    opacity: '.94',
    margin: '0',
  });
  ghost.removeAttribute('draggable');
  ghost.dataset.demoDrag = '';
  document.body.appendChild(ghost);
  const pointer = point(source);
  if (pointerTimer) clearTimeout(pointerTimer);
  pointer.style.transition = 'opacity 200ms';
  let x = 0,
    y = 0;
  let previous: HTMLElement | null = null;
  try {
    for (const level of ['Internal', 'Confidential', 'Restricted']) {
      const target = document.querySelector<HTMLElement>(
        `.reef-region-${level.toLowerCase()}`,
      );
      if (!source.isConnected || !target || !ghost.isConnected) return;
      previous?.dispatchEvent(
        new DragEvent('dragleave', { bubbles: true, dataTransfer: transfer }),
      );
      target.dispatchEvent(
        new DragEvent('dragenter', { bubbles: true, dataTransfer: transfer }),
      );
      target.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, dataTransfer: transfer }),
      );
      const to = target.getBoundingClientRect();
      const nx = to.left - from.left + 28,
        ny = to.top - from.top + 28;
      const options: KeyframeAnimationOptions = {
        duration: 1000,
        easing: 'cubic-bezier(.25,.1,.25,1)',
        fill: 'forwards',
      };
      const move = ghost.animate(
        [
          { transform: `translate(${x}px,${y}px) scale(1.025)` },
          { transform: `translate(${nx}px,${ny}px) scale(1.025)` },
        ],
        options,
      );
      const cursor = pointer.animate(
        [
          {
            transform: `translate(${from.left + x + 32}px,${from.top + y + 20}px)`,
          },
          {
            transform: `translate(${from.left + nx + 32}px,${from.top + ny + 20}px)`,
          },
        ],
        options,
      );
      await Promise.all([move.finished, cursor.finished]);
      await new Promise((resolve) => setTimeout(resolve, 200));
      x = nx;
      y = ny;
      previous = target;
    }
    if (source.isConnected && previous?.isConnected)
      previous.dispatchEvent(
        new DragEvent('drop', { bubbles: true, dataTransfer: transfer }),
      );
  } catch {
    /* Navigating away cancels this visual gesture. */
  } finally {
    source.dispatchEvent(
      new DragEvent('dragend', { bubbles: true, dataTransfer: transfer }),
    );
    ghost.remove();
    pointer.style.opacity = '0';
    pointer.getAnimations().forEach((a) => a.cancel());
    pointer.style.transition =
      'transform 260ms cubic-bezier(.2,0,.2,1),opacity 200ms';
  }
}

function closeDialogs() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
    }),
  );
  const close = document.querySelector<HTMLButtonElement>(
    '[aria-label="Close details"]',
  );
  close?.click();
}
function fill(text: string, thread = false) {
  const input = document.querySelector<HTMLTextAreaElement>(
    `${thread ? '.thread-composer' : '.composer-wrap'} textarea[aria-label="Message conversation"]`,
  );
  if (!input || input.value === text) return;
  Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set?.call(input, text);
  input.setSelectionRange(text.length, text.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
const part = (text: string, t: number, start: number, seconds: number) =>
  text.slice(
    0,
    Math.round(text.length * Math.max(0, Math.min(1, (t - start) / seconds))),
  );
const threadPrompt = '@Ledger have Nova check what blocks the alternate.';
const threadAnswer =
  'PSU-B reached 11.2 ms; the minimum is 12 ms. Marcus needs five B2 units retested before qualification.\n\nSource: [cedar-psu-qualification.md §1]';
const draftPrompt =
  '@Ledger draft an engineering update without supplier terms.';
const draftAnswer =
  'Draft for engineering: Launch supply is covered. The remaining build awaits alternate power-module qualification. Marcus owns validation.\n\nSupplier terms omitted. Ready for Orion’s review.';
const scoutPrompt = '@Scout can you read cedar-power-goals.md?';
const scoutAnswer =
  'Access blocked. This file is Restricted and I have no approved grant. I haven’t read it. Ask Orion for an approved summary.';
const decisionAnswer =
  'Review recorded. I’ll carry the $918,800 plan and the remaining qualification gate into our next session. No orders placed.';
const phases = [
  0, 23, 24.5, 27.5, 29, 30, 33, 35, 36, 37, 41, 43, 43.5, 46.5, 47.1, 50.5, 54,
  54.7, 57, 57.7, 60.3, 63.5, 64, 65.5, 67, 68, 71, 71.5, 73.2, 76, 77.4, 82,
  83.5, 85.3, 88, 88.5, 90.5, 91, 92.6, 95, 95.3, 97.5, 98, 99.8, 101, 102, 105,
  106, 107, 107.3, 109.2, 110, 112,
];
const exchanges = [
  {
    question: 46.5,
    start: 47.1,
    end: 50.5,
    id: 'answer',
    prompt,
    text: answer,
    agentId: 'ledger',
    name: 'Ledger',
  },
  {
    question: 57,
    start: 57.7,
    end: 60.3,
    id: 'thread-answer',
    prompt: threadPrompt,
    text: threadAnswer,
    agentId: 'nova',
    name: 'Nova',
    room: 'thread:replay-answer',
  },
  {
    question: 71,
    start: 71.5,
    end: 73.2,
    id: 'resumed',
    prompt: recall,
    text: resumed,
    agentId: 'ledger',
    name: 'Ledger',
  },
  {
    question: 90.5,
    start: 91,
    end: 92.6,
    id: 'scout-blocked',
    prompt: scoutPrompt,
    text: scoutAnswer,
    agentId: 'scout',
    name: 'Scout',
  },
  {
    question: 97.5,
    start: 98,
    end: 99.8,
    id: 'draft',
    prompt: draftPrompt,
    text: draftAnswer,
    agentId: 'ledger',
    name: 'Ledger',
  },
];

function phaseAt(t: number) {
  return phases.filter((n) => n <= t).at(-1) ?? 0;
}

export function installReplayRuntime() {
  const nativeFetch = window.fetch.bind(window);
  const nativeInterval = window.setInterval.bind(window);
  // Match the native health poll to the condensed, simulated setup sequence.
  window.setInterval = ((
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) =>
    nativeInterval(
      handler,
      timeout === 30000 ? 750 : timeout,
      ...args,
    )) as typeof window.setInterval;
  let state = structuredClone(snapshot) as unknown as WorkspaceState;
  let currentTime = 0,
    phase = -1,
    revision = 0;
  let added: DocumentRecord | null = null;
  let created: MemberRecord | null = null;
  let approved = false;
  const patches = new Map<string, Partial<DocumentRecord>>();
  let lastInput = '';
  let lastStreamFrame = -1;
  let restoring = false;
  const json = (data: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  window.fetch = async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.protocol === 'http:' ||
        window.location.protocol === 'https:'
        ? window.location.href
        : 'http://shoal.demo/',
    );
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);
    const method = init?.method ?? 'GET';
    if (url.pathname === '/api/state') return json(state);
    if (url.pathname === '/api/events') return json({ events: [] });
    if (url.pathname === '/api/runtime')
      return json({
        homes: [
          {
            id: 'lab',
            name: 'Dell GB10',
            connected: currentTime >= 35,
            model: 'Local replay',
          },
        ],
        nodes: [],
      });
    if (url.pathname === '/api/compute/setup')
      return json({
        phase:
          currentTime < 30
            ? 'not_installed'
            : currentTime < 33
              ? 'downloading'
              : currentTime < 35
                ? 'starting'
                : 'ready',
        progress:
          currentTime < 33
            ? Math.min(96, Math.round((currentTime - 30) * 32))
            : 100,
        model: 'Holo-3.1-35B-A3B-NVFP4',
        message:
          currentTime < 33
            ? 'Downloading local model'
            : 'Starting sandbox and local inference',
      });
    if (url.pathname === '/api/runs' && method === 'POST') {
      const run = state.runs.find((r) => r.id === 'replay-answer-run');
      if (run) run.status = 'preparing';
      return json({ run });
    }
    if (url.pathname === '/api/messages' && method === 'POST') {
      const data = JSON.parse(
        typeof init?.body === 'string' ? init.body : '{}',
      );
      const message = state.messages.find((m) => m.body === data.text) || {
        ...newMessage(`replay-user-${currentTime}`, data.text),
        room: data.room || 'cedar-sourcing',
      };
      if (!state.messages.some((m) => m.id === message.id))
        state.messages.push(message);
      return json({ message, runs: [] });
    }
    if (url.pathname.startsWith('/api/approvals/') && method === 'POST') {
      const id = url.pathname.split('/').at(-1);
      const data = JSON.parse(
        typeof init?.body === 'string' ? init.body : '{}',
      );
      const approval = state.approvals.find((item) => item.id === id)!;
      approved = data.decision === 'Approved';
      Object.assign(approval, {
        status: data.decision,
        decidedBy: 'Orion',
        decidedAt: stamp,
      });
      return json({ approval });
    }
    if (url.pathname === '/api/documents') {
      if (method === 'POST' && init?.body instanceof FormData) {
        const form = init.body;
        const file = form.get('file') as File;
        added = {
          id: 'replay-import',
          name: file.name,
          type: file.type || 'text/markdown',
          size: file.size,
          collection: form.get('collection') as string,
          level: form.get('level') as string as DocumentRecord['level'],
          owner: 'Orion',
          audiences: JSON.parse((form.get('audiences') as string) || '[]'),
          agents: JSON.parse((form.get('agents') as string) || '[]'),
          status: 'ready',
          textChars: file.size,
          chunkCount: 1,
          updatedAt: stamp,
          error: null,
        };
        state.documents.push(added);
        return json({ document: added });
      }
      if (method === 'PATCH') {
        const data = JSON.parse(
          typeof init?.body === 'string' ? init.body : '{}',
        );
        const doc = state.documents.find(
          (d) => d.id === (data.id || url.searchParams.get('id')),
        )!;
        Object.assign(doc, data, { updatedAt: stamp });
        patches.set(doc.id, { ...doc });
        return json({ document: doc });
      }
      const id = url.searchParams.get('id');
      const doc =
        corpus.documents.find((d) => `bell-${d.id}` === id) ||
        corpus.documents.find((d) => d.id === 'doc-cedar-sourcing')!;
      return new Response(doc.body, {
        headers: { 'Content-Type': 'text/markdown' },
      });
    }
    if (url.pathname === '/api/context') {
      const request = JSON.parse(
        typeof init?.body === 'string' ? init.body : '{}',
      );
      return json({
        passages:
          request.agentId === 'scout'
            ? []
            : [
                {
                  documentId: 'bell-doc-cedar-sourcing',
                  documentName: 'launch-allocation.md',
                  text: corpus.documents.find(
                    (d) => d.id === 'doc-cedar-sourcing',
                  )!.body,
                  idx: 0,
                  chunkId: 'bell-doc-cedar-sourcing:0',
                  score: 1,
                  level: 'Restricted',
                },
              ],
      });
    }
    if (url.pathname === '/api/agents' && method === 'POST') {
      const data = JSON.parse(
        typeof init?.body === 'string' ? init.body : '{}',
      );
      let member = state.members.find((m) => m.id === data.id);
      if (member) member.data = { ...member.data, ...data };
      else {
        member = {
          id: data.id,
          kind: 'agent',
          name: data.name,
          initials: data.initials || data.name.slice(0, 2),
          tone: data.tone || 'mint',
          data,
        };
        created = member;
        state.members.push(member);
      }
      return json({ member });
    }
    return json(
      { error: 'This action is outside the recorded Bell walkthrough.' },
      400,
    );
  };
  function rebuild(t: number) {
    const base = structuredClone(snapshot) as unknown as WorkspaceState;
    base.messages = base.messages.filter(
      (m) =>
        m.room !== 'cedar-sourcing' && !m.room.startsWith('thread:replay-'),
    );
    base.runs = [];
    base.messages.push(
      newMessage(
        'replay-context',
        'We need a qualified supply plan for 4,000 Summit R8 servers. Keep supplier terms in this channel.',
      ),
    );
    for (const entry of exchanges) {
      if (t < entry.question) continue;
      const room = entry.room || 'cedar-sourcing';
      const id = `replay-${entry.id}`;
      const done = t >= entry.end;
      const result = part(entry.text, t, entry.start, entry.end - entry.start);
      base.messages.push({
        ...newMessage(`${id}-question`, entry.prompt),
        room,
      });
      base.messages.push({
        ...newMessage(id, result, true),
        memberId: entry.agentId,
        name: entry.name,
        room,
        runId: `${id}-run`,
        state: done ? 'complete' : 'pending',
      });
      base.runs.push({
        id: `${id}-run`,
        kind: 'chat',
        agentId: entry.agentId,
        room,
        messageId: id,
        status: done ? 'completed' : 'running',
        backend: 'openclaw',
        mode: 'quick',
        triggerMessageId: `${id}-question`,
        createdAt: new Date(
          Date.parse(stamp) + entry.question * 1000,
        ).toISOString(),
        result: done ? entry.text : null,
      });
    }
    const ledger = base.members.find((m) => m.id === 'ledger');
    if (ledger) ledger.data.paused = t >= 64 && t < 65.5;
    if (t >= 64 && t < 67) {
      const message = base.messages.find((m) => m.id === 'replay-answer');
      const run = base.runs.find((r) => r.id === 'replay-answer-run');
      if (message) {
        message.state = 'error';
        message.error = 'Local session interrupted. Retry to resume.';
      }
      if (run) run.status = t < 65.5 ? 'failed' : 'preparing';
    }
    const approval = base.approvals.find((a) => a.id === 'bell-review-CED-401');
    if (approval) {
      approval.title = 'Cedar engineering update';
      approval.body =
        'Launch supply is covered. The remaining build awaits alternate power-module qualification. Marcus owns validation. Supplier terms are omitted.';
      approval.action =
        'Approve this draft for the engineering team. This demo records a review decision only.';
      approval.workflow = 'Engineering draft';
      if (approved && t >= 105) approval.status = 'Approved';
    }
    if (approved && t >= 107.3)
      base.messages.push({
        ...newMessage(
          'replay-decision',
          part(decisionAnswer, t, 107.3, 1.9),
          true,
        ),
        state: t < 109.2 ? 'pending' : 'complete',
      });
    if (added) base.documents.push(added);
    if (created && t >= 41) base.members.push(created);
    const movingFile = base.documents.find(
      (doc) => doc.name === 'cedar-power-goals.md',
    );
    if (movingFile)
      movingFile.agents = movingFile.agents.filter(
        (id) => !['atlas', 'ledger'].includes(id),
      );
    base.documents = base.documents.map((doc) => ({
      ...doc,
      ...patches.get(doc.id),
    }));
    state = base;
  }
  const later = (ms: number, fn: () => void, expected: number) =>
    setTimeout(() => {
      if (revision === expected) fn();
    }, ms);
  function nativeAction(_t: number, key: number) {
    const rev = revision;
    const focusInput = (thread = false) => {
      const input = document.querySelector<HTMLTextAreaElement>(
        `${thread ? '.thread-composer' : '.composer-wrap'} textarea[aria-label="Message conversation"]`,
      );
      if (input) {
        point(input);
        input.focus();
      }
    };
    const send = (thread = false) => {
      click(thread ? 'Send reply' : 'Send message');
      later(400, () => fill('', thread), rev);
    };
    const channel = () => {
      closeDialogs();
      click('cedar-sourcing');
    };
    if (key === 0 || key === 23) {
      closeDialogs();
      click('Data');
    }
    if (key === 24.5) click('View details for launch-allocation.md');
    if (key === 27.5) closeDialogs();
    if (key === 29) {
      closeDialogs();
      click('Habitats');
    }
    if (key === 30) click('Download and set up');
    if (key === 36) click('New local agent');
    if (key === 37) {
      click('octopus avatar');
      const input = document.querySelector<HTMLInputElement>(
        '[aria-label="Agent name"]',
      );
      if (input) {
        point(input);
        input.focus();
      }
    }
    if (key === 41) {
      fillField('Agent name', 'Cedar Analyst');
      click('Create');
    }
    if (key === 43 || key === 88 || key === 107) channel();
    if ([43.5, 68, 88.5, 95.3].includes(key)) focusInput();
    if ([46.5, 71, 90.5, 97.5].includes(key)) send();
    if (key === 54) {
      const row = [
        ...document.querySelectorAll<HTMLElement>('.message-row'),
      ].find((n) =>
        n.textContent?.includes('2,600 of 4,000 servers are covered'),
      );
      const reply = row?.querySelector<HTMLButtonElement>(
        '[aria-label="Reply"]',
      );
      if (reply) {
        point(reply);
        later(280, () => reply.click(), rev);
      }
    }
    if (key === 54.7) focusInput(true);
    if (key === 57) send(true);
    if (key === 63.5) closeDialogs();
    if (key === 65.5) click('Retry');
    if (key === 76) {
      closeDialogs();
      click('Data');
    }
    if (key === 77.4) void dragSource();
    if (key === 83.5)
      click('Manage agent connections for cedar-power-goals.md');
    if (key === 85.3) {
      const grant = document.querySelector<HTMLButtonElement>(
        '.reef-agent[title="Allow Ledger for cedar-power-goals.md"]',
      );
      if (grant) {
        point(grant);
        later(280, () => grant.click(), rev);
      }
    }
    if (key === 101) {
      closeDialogs();
      click('Inbox');
      later(
        550,
        () => {
          const row = [
            ...document.querySelectorAll<HTMLButtonElement>(
              '.quality-inbox-row',
            ),
          ].find((n) => n.textContent?.includes('Cedar engineering update'));
          if (row) {
            point(row);
            row.click();
          }
        },
        rev,
      );
    }
    if (key === 102) click('Review action');
    if (key === 105) click('Approve');
    if (key === 106) closeDialogs();
    if (key === 110) {
      const row = [
        ...document.querySelectorAll<HTMLElement>('.message-row'),
      ].find((n) => n.textContent?.includes('Review recorded.'));
      const react = row?.querySelector<HTMLButtonElement>(
        '[aria-label="React"]',
      );
      if (react) {
        point(react);
        later(
          280,
          () => {
            react.click();
            later(
              100,
              () =>
                row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
              rev,
            );
          },
          rev,
        );
      }
    }
  }
  const onTime = (event: MessageEvent) => {
    if (event.source !== window.parent || event.data?.type !== 'shoal:time')
      return;
    const t = Number(event.data.time);
    if (!Number.isFinite(t)) return;
    if (event.data.seek === true) {
      const checkpoint = makeReplaySeekCheckpoint(
        t,
        snapshot as unknown as WorkspaceState,
        { created: 41.28, restricted: 81.2, granted: 85.58, approved: 105.28 },
      );
      patches.clear();
      for (const [id, patch] of checkpoint.patches) patches.set(id, patch);
      created = checkpoint.created;
      added = null;
      approved = checkpoint.approved;
      currentTime = t;
      phase = phaseAt(t);
      revision++;
      lastInput = '';
      lastStreamFrame = -1;
      const expected = revision;
      restoring = true;
      const previousAnchor = document.querySelector('.rail-profile');
      document
        .querySelectorAll('[data-demo-drag]')
        .forEach((node) => node.remove());
      document
        .querySelector<HTMLElement>('[data-demo-cursor]')
        ?.style.setProperty('opacity', '0');
      rebuild(t);
      window.dispatchEvent(new Event('shoal:remount'));
      void refresh().then(async () => {
        await restoreReplaySeekUI(t, {
          isCurrent: () => revision === expected,
          previousAnchor,
          fillField,
          fill,
        });
        if (revision === expected) restoring = false;
      });
      return;
    }
    if (restoring) return;
    currentTime = t;
    const next = phaseAt(t);
    const streaming =
      exchanges.some((e) => t >= e.start && t < e.end) ||
      (approved && t >= 107.3 && t < 109.2);
    const streamFrame = Math.floor(t * 10);
    if (next === phase && streaming && streamFrame !== lastStreamFrame) {
      lastStreamFrame = streamFrame;
      rebuild(t);
      void refresh();
    }
    if (next !== phase) {
      phase = next;
      revision++;
      rebuild(t);
      const expected = revision;
      void refresh().then(() => {
        if (revision === expected) nativeAction(t, next);
      });
    }
    if (t >= 37 && t < 41) {
      fillField('Agent name', part('Cedar Analyst', t, 37, 1.1));
      fillField(
        'Agent instructions',
        part(
          'Review supplier evidence. Flag risks. Ask Orion to approve.',
          t,
          38,
          2.5,
        ),
      );
    }
    const typing = [
      { start: 43.5, end: 46.5, text: prompt, thread: false },
      { start: 54.7, end: 57, text: threadPrompt, thread: true },
      { start: 68, end: 71, text: recall, thread: false },
      { start: 88.5, end: 90.5, text: scoutPrompt, thread: false },
      { start: 95.3, end: 97.5, text: draftPrompt, thread: false },
    ].find((entry) => t >= entry.start && t < entry.end);
    const composing = typing
      ? {
          text: part(
            typing.text,
            t,
            typing.start,
            typing.end - typing.start - 0.25,
          ),
          thread: typing.thread,
        }
      : null;
    if (composing && composing.text !== lastInput) {
      lastInput = composing.text;
      fill(composing.text, composing.thread);
    }
  };
  window.addEventListener('message', onTime);
  return () => {
    window.fetch = nativeFetch;
    window.setInterval = nativeInterval;
    window.removeEventListener('message', onTime);
  };
}
