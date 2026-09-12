/** Draft module for app/demo/shoal-seek-helper.ts. No transport or playback side effects. */
import type {
  ApprovalRecord,
  DocumentRecord,
  MemberRecord,
  WorkspaceState,
} from '@/lib/buzz/types';

export const SEEK_AGENT_ID = 'replay-cedar-analyst';
export const SEEK_APPROVAL_ID = 'bell-review-CED-401';
const STAMP = '2026-09-12T14:30:00.000Z';
const INSTRUCTIONS =
  'Review supplier evidence. Flag risks. Ask Orion to approve.';
const LEVELS = ['Public', 'Internal', 'Confidential', 'Restricted'];
const clamp = (t: number) =>
  Math.min(120, Math.max(0, Number.isFinite(t) ? t : 0));
const at = (t: number) => new Date(Date.parse(STAMP) + t * 1000).toISOString();
const partial = (s: string, t: number, start: number, seconds: number) =>
  s.slice(
    0,
    Math.round(s.length * Math.max(0, Math.min(1, (t - start) / seconds))),
  );

/** Keep these commit times aligned with nativeAction and the continuous drag's final drop. */
export type SeekCommitTimes = {
  created: number;
  restricted: number;
  granted: number;
  approved: number;
};
export const SEEK_COMMITS: SeekCommitTimes = {
  created: 41,
  restricted: 82,
  granted: 85.3,
  approved: 105,
};
export type ReplaySeekCheckpoint = {
  created: MemberRecord | null;
  added: null;
  approved: boolean;
  patches: Array<[string, Partial<DocumentRecord>]>;
  approvalPatch: Pick<ApprovalRecord, 'status' | 'decidedBy' | 'decidedAt'>;
};

/** Pure: seeking backward/forward produces the same records, regardless of earlier clicks. */
export function makeReplaySeekCheckpoint(
  value: number,
  seed: Pick<WorkspaceState, 'members' | 'documents'>,
  commits: SeekCommitTimes = SEEK_COMMITS,
): ReplaySeekCheckpoint {
  const t = clamp(value);
  const created: MemberRecord | null =
    t < commits.created
      ? null
      : {
          id: SEEK_AGENT_ID,
          kind: 'agent',
          name: 'Cedar Analyst',
          initials: 'Ce',
          tone: 'slate',
          data: {
            demo: true,
            character: 'octopus',
            homeId: 'lab',
            runtime: 'local',
            device: 'Dell GB10',
            model: 'Holo-3.1-35B-A3B · NVFP4',
            accessLevel: 'Confidential',
            owner: 'You',
            role: '',
            description: INSTRUCTIONS,
            instructions: INSTRUCTIONS,
            color: 'slate',
            channels: [],
            context: [],
            capabilities: [],
            goal: '',
            audiences: [],
            accessPaths: [],
            approvalGates: [],
            examplePrompts: [],
            nameCustomized: true,
            isNew: true,
            paused: false,
            createdAt: Date.parse(at(commits.created)),
          },
        };
  const patches: ReplaySeekCheckpoint['patches'] = [];
  const file = seed.documents.find(
    (doc) => doc.name === 'cedar-power-goals.md',
  );
  if (file) {
    const restricted = t >= commits.restricted;
    const level = restricted ? 'Restricted' : file.level;
    const resolve = (value: string) =>
      seed.members.find(
        (m) => m.id === value || m.name === value.split(' · ')[0],
      );
    let agents = file.agents.filter((value) => {
      const m = resolve(value);
      return !['atlas', 'ledger'].includes(m?.id ?? value);
    });
    if (restricted) {
      // Same filtering as DataView.changeLevel: remove insufficient/local-only grants.
      agents = agents.flatMap((value) => {
        const m = resolve(value);
        return m?.kind === 'agent' &&
          m.data.runtime !== 'cloud' &&
          LEVELS.indexOf(String(m.data.accessLevel)) >= LEVELS.indexOf(level)
          ? [m.id]
          : [];
      });
    }
    if (
      restricted &&
      t >= commits.granted &&
      seed.members.some((m) => m.id === 'ledger')
    )
      agents = [...new Set([...agents, 'ledger'])];
    patches.push([
      file.id,
      {
        level,
        agents,
        audiences: restricted
          ? file.audiences.filter((a) => a !== 'Everyone in workspace')
          : [...file.audiences],
        updatedAt: restricted
          ? at(t >= commits.granted ? commits.granted : commits.restricted)
          : file.updatedAt,
      },
    ]);
  }
  const approved = t >= commits.approved;
  return {
    created,
    added: null,
    approved,
    patches,
    approvalPatch: {
      status: approved ? 'Approved' : 'Pending',
      decidedBy: approved ? 'Orion' : null,
      decidedAt: approved ? at(commits.approved) : null,
    },
  };
}

export type ReplaySeekView = {
  page: 'Data' | 'Habitats' | 'cedar-sourcing' | 'Inbox';
  create: boolean;
  thread: boolean;
  fileDetails: boolean;
  connections: boolean;
  reviewDialog: boolean;
};
export function replaySeekView(value: number): ReplaySeekView {
  const t = clamp(value);
  return {
    page:
      t < 29
        ? 'Data'
        : t < 43
          ? 'Habitats'
          : t >= 76 && t < 88
            ? 'Data'
            : t >= 101 && t < 107
              ? 'Inbox'
              : 'cedar-sourcing',
    create: t >= 36 && t < 41,
    thread: t >= 54 && t < 63.5,
    fileDetails: t >= 24.5 && t < 27.5,
    connections: t >= 83.5 && t < 88,
    // Approve closes the native modal; at 106 show the selected, Approved Inbox record.
    reviewDialog: t >= 102 && t < 105,
  };
}

export type ReplaySeekCopy = {
  finance: string;
  thread: string;
  recall: string;
  scout: string;
  draft: string;
  parentAnswer: string;
  instructions: string;
};
export const SEEK_COPY: ReplaySeekCopy = {
  finance: '@Ledger review Cedar’s vendor allocation and launch exposure.',
  thread: '@Ledger have Nova check what blocks the alternate.',
  recall: '@Ledger where were we on the vendor review?',
  scout: '@Scout can you read cedar-power-goals.md?',
  draft: '@Ledger draft an engineering update without supplier terms.',
  parentAnswer: '2,600 of 4,000 servers are covered',
  instructions: INSTRUCTIONS,
};

type SeekUIOptions = {
  /** A guard over the installReplayRuntime revision captured for this seek. */
  isCurrent: () => boolean;
  /** Pass an old Workspace descendant captured before shoal:remount. */
  previousAnchor?: Element | null;
  fillField: (label: string, text: string) => void;
  fill: (text: string, thread?: boolean) => void;
  copy?: ReplaySeekCopy;
};

/** Restore only navigation/local UI. Never clicks Create, Send, Retry, Approve, or a grant. */
export async function restoreReplaySeekUI(
  value: number,
  options: SeekUIOptions,
): Promise<boolean> {
  const t = clamp(value),
    view = replaySeekView(t),
    copy = options.copy ?? SEEK_COPY;
  const shown = (e: Element) => !!(e as HTMLElement).offsetParent;
  const query = <T extends HTMLElement>(selector: string) =>
    [...document.querySelectorAll<T>(selector)].find(shown);
  const findButton = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (e) =>
        shown(e) &&
        !e.disabled &&
        (e.textContent?.trim() === name ||
          e.getAttribute('aria-label') === name),
    );
  const until = async <T>(
    get: () => T | undefined | null | false,
  ): Promise<T | undefined> => {
    const deadline = performance.now() + 2400;
    while (options.isCurrent() && performance.now() < deadline) {
      const result = get();
      if (result) return result;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 25));
    }
    return undefined;
  };
  const press = async (name: string) => {
    const e = await until(() => findButton(name));
    if (!e || !options.isCurrent()) return false;
    e.click();
    return true;
  };
  // A fresh Workspace clears stale dialogs, filters, selections, scroll and draft state.
  if (
    options.previousAnchor &&
    !(await until(() => !options.previousAnchor!.isConnected))
  )
    return false;
  if (!(await press(view.page))) return false;
  if (view.page === 'Data' && !(await until(() => query('.reef-canvas'))))
    return false;
  if (
    view.page === 'Habitats' &&
    !(await until(() => findButton('New local agent')))
  )
    return false;
  if (view.page === 'Inbox' && !(await until(() => query('.quality-inbox'))))
    return false;
  if (
    view.page === 'cedar-sourcing' &&
    !(await until(() => {
      const title = query('[data-testid="chat-title"]');
      return title?.textContent?.includes('cedar-sourcing') ? title : undefined;
    }))
  )
    return false;
  if (!options.isCurrent()) return false;

  if (view.create) {
    if (!(await press('New local agent'))) return false;
    if (
      !(await until(() => query<HTMLInputElement>('[aria-label="Agent name"]')))
    )
      return false;
    // The native creation dialog randomizes its initial portrait; a seek must not.
    if (!(await press('octopus avatar'))) return false;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    if (!options.isCurrent()) return false;
    options.fillField(
      'Agent name',
      t < 37 ? 'Cedar Analyst' : partial('Cedar Analyst', t, 37, 1.1),
    );
    options.fillField(
      'Agent instructions',
      partial(copy.instructions, t, 38, 2.5),
    );
  }
  if (
    view.fileDetails &&
    !(await press('View details for launch-allocation.md'))
  )
    return false;
  if (
    view.connections &&
    !(await press('Manage agent connections for cedar-power-goals.md'))
  )
    return false;
  if (view.thread) {
    const reply = await until(() => {
      const row = [
        ...document.querySelectorAll<HTMLElement>('.chat-page .message-row'),
      ].find((e) => shown(e) && e.textContent?.includes(copy.parentAnswer));
      return row?.querySelector<HTMLButtonElement>('[aria-label="Reply"]');
    });
    if (!reply || !options.isCurrent()) return false;
    reply.click();
    if (!(await until(() => query('.thread-composer textarea')))) return false;
  }
  if (view.page === 'Inbox') {
    const row = await until(() =>
      [
        ...document.querySelectorAll<HTMLButtonElement>('.quality-inbox-row'),
      ].find(
        (e) => shown(e) && e.textContent?.includes('Cedar engineering update'),
      ),
    );
    if (!row || !options.isCurrent()) return false;
    row.click();
    if (!(await until(() => query('.quality-inbox-message')))) return false;
    if (view.reviewDialog && !(await press('Review action'))) return false;
  }
  if (!options.isCurrent()) return false;
  options.fill('');
  options.fill('', true);
  const typing = [
    { start: 43.5, end: 46.5, text: copy.finance, thread: false },
    { start: 54.7, end: 57, text: copy.thread, thread: true },
    { start: 68, end: 71, text: copy.recall, thread: false },
    { start: 88.5, end: 90.5, text: copy.scout, thread: false },
    { start: 95.3, end: 97.5, text: copy.draft, thread: false },
  ].find((e) => t >= e.start && t < e.end);
  if (typing)
    options.fill(
      partial(typing.text, t, typing.start, typing.end - typing.start - 0.25),
      typing.thread,
    );
  return true;
}
