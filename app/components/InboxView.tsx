// List/detail hierarchy adapted from Buzz InboxListPane and InboxDetailPane.
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBuzz, type BuzzStore } from '@/lib/buzz/store';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCheck,
  Inbox,
  Mail,
  MailOpen,
  Search,
  X,
} from 'lucide-react';
import { MemberAvatar } from '@/components/MemberAvatar';
import { useWorkspaceMembers, type WorkspaceMember } from '@/lib/workspace-members';
import { PageHeader } from '@/components/buzz/PageHeader';
type Item = {
  id: string;
  sourceId: string;
  authorId: string;
  authorName: string;
  kind: 'review' | 'mention';
  channel: string;
  context: string;
  time: string;
  fullTime: string;
  createdAt: string;
  text: string;
  title: string;
  approvalId?: string;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  threadId?: string;
};
const readStorageKey = 'shoal-inbox-read';

function timeLabels(createdAt: string) {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? { time: '', fullTime: '' }
    : { time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), fullTime: date.toLocaleString() };
}

/** Shared records are the only source of inbox content; no local demonstration rows. */
export function buildInboxItems(
  state: Pick<BuzzStore, 'approvals' | 'messages' | 'runs'>,
  members: readonly WorkspaceMember[],
): Item[] {
  const { approvals, messages, runs } = state;
  const operator = members.find((member) => member.id === 'you');
  const mentionNames = ['you', operator?.name].filter((name): name is string => !!name);
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mentionsOperator = new RegExp(`(^|[^\\w@])@(?:${mentionNames.map(escape).join('|')})(?=$|[^\\w-])`, 'i');
  const byMessageId = new Map(messages.map((message) => [message.id, message]));
  const contextFor = (room: string) => {
    if (room.startsWith('dm:')) {
      const member = members.find((item) => item.id === room.slice(3));
      return member ? `Direct message · ${member.name}` : 'Direct message';
    }
    return room ? `#${room}` : 'Conversation';
  };
  return [
    ...approvals.map((approval): Item => {
      const author = members.find((member) => member.id === approval.agent || member.name === approval.agent);
      const room = runs.find((run) => run.id === approval.runId)?.room || '';
      return {
        id: `approval:${approval.id}`, sourceId: approval.id, approvalId: approval.id,
        authorId: author?.id || approval.agent, authorName: author?.name || approval.agent,
        kind: 'review', channel: room,
        context: `${room ? contextFor(room) : approval.workflow || 'Approvals'} · ${approval.status}`,
        ...timeLabels(approval.createdAt), createdAt: approval.createdAt,
        text: approval.body, title: approval.title, approvalStatus: approval.status,
      };
    }),
    ...messages.filter((message) => message.memberId !== 'you' && message.state !== 'pending' && message.state !== 'error' && mentionsOperator.test(message.body)).map((message): Item => {
      let room = message.room;
      const threadId = room.startsWith('thread:') ? room.slice(7) : undefined;
      const visited = new Set<string>();
      while (room.startsWith('thread:') && !visited.has(room)) {
        visited.add(room);
        const parent = byMessageId.get(room.slice(7));
        if (!parent) break;
        room = parent.room;
      }
      const author = members.find((member) => member.id === message.memberId);
      const name = author?.name || message.name || message.memberId;
      return {
        id: `mention:${message.id}`, sourceId: message.id,
        authorId: message.memberId, authorName: name, kind: 'mention',
        channel: room, context: room.startsWith('thread:') ? 'Thread' : `${contextFor(room)}${threadId ? ' · Thread' : ''}`,
        ...timeLabels(message.createdAt), createdAt: message.createdAt,
        text: message.body, title: `${name} mentioned you`, threadId,
      };
    }),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

type Props = {
  /** An explicit ID opens that record; omitted IDs retain Workspace's first-pending behavior. */
  reviewDraft: (id?: string) => void;
  /** The optional second argument opens a mention's parent thread after its room. */
  openRoom: (name: string, threadId?: string) => void;
};
export function InboxView({ reviewDraft, openRoom }: Props) {
  const members = useWorkspaceMembers();
  const { approvals, messages, runs, loaded, online } = useBuzz();
  const items = useMemo(() => buildInboxItems({ approvals, messages, runs }, members), [approvals, messages, runs, members]);
  const [read, setRead] = useState<string[]>([]);
  const [readLoaded, setReadLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(readStorageKey) || '[]');
        if (Array.isArray(saved)) setRead(saved.filter((id): id is string => typeof id === 'string'));
      } catch { /* Read preferences are optional when storage is unavailable. */ }
      setReadLoaded(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!readLoaded) return;
    try { localStorage.setItem(readStorageKey, JSON.stringify(read)); }
    catch { /* Keep the current session usable when storage is unavailable. */ }
  }, [read, readLoaded]);
  // Recognize existing unprefixed read IDs from the backend fork as well.
  const isRead = (item: Item) => read.includes(item.id) || read.includes(item.sourceId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedId, setFocusedId] = useState('');
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const unreadCount = items.filter(
    (item) => !isRead(item),
  ).length;
  const author = (item: Item) =>
    members.find((member) => member.id === item.authorId);
  const authorName = (item: Item) =>
    author(item)?.name || item.authorName;
  const title = (item: Item) => item.title;
  const visible = items.filter(
    (item) =>
      (!unreadOnly || !isRead(item)) &&
      `${authorName(item)} ${title(item)} ${item.text} ${item.context}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const selected = items.find((item) => item.id === selectedId);
  const markRead = (id: string) =>
    setRead((current) => (current.includes(id) ? current : [...current, id]));
  function select(item: Item) {
    setSelectedId(item.id);
    markRead(item.id);
    if (unreadOnly || window.matchMedia('(max-width:760px)').matches)
      requestAnimationFrame(() =>
        detailHeading.current?.focus({ preventScroll: true }),
      );
  }
  function avatar(item: Item) {
    const member = author(item);
    return <MemberAvatar member={member} name={authorName(item)} initials={authorName(item).split(/\s+/).map((part) => part[0]).slice(0, 2).join('')} size={32} />;
  }
  return (
    <div className="page quality-inbox">
      <PageHeader
        className="page-heading"
        title="Inbox"
        action={
          <button
            className="btn btn-secondary"
            onClick={() => setRead((current) => [...new Set([...current, ...items.map((item) => item.id)])])}
            disabled={!unreadCount}
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        }
      />
      <div
        className={`quality-inbox-layout ${selected ? 'has-selection' : ''}`}
      >
        <section className="quality-inbox-list" aria-label="Inbox messages">
          <div className="quality-inbox-toolbar">
            <fieldset aria-label="Inbox filter">
              <button
                aria-pressed={!unreadOnly}
                onClick={() => setUnreadOnly(false)}
              >
                All
              </button>
              <button
                aria-pressed={unreadOnly}
                onClick={() => setUnreadOnly(true)}
              >
                Unread <span>{unreadCount}</span>
              </button>
            </fieldset>
            <label className="quality-inbox-search">
              <Search size={16} />
              <input
                aria-label="Search inbox"
                placeholder="Search inbox"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear inbox search"
                  onClick={() => setQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
          <ul className="quality-inbox-rows">
            {visible.map((item, index) => (
              <li key={item.id}>
                <button
                  ref={(node) => {
                    if (node) rowRefs.current.set(item.id, node);
                    else rowRefs.current.delete(item.id);
                  }}
                  className={`quality-inbox-row ${isRead(item) ? 'is-read' : 'is-unread'} ${selectedId === item.id ? 'selected' : ''}`}
                  aria-current={selectedId === item.id ? 'true' : undefined}
                  aria-label={`${title(item)}, ${isRead(item) ? 'read' : 'unread'}`}
                  aria-controls="quality-inbox-detail"
                  tabIndex={
                    focusedId === item.id ||
                    (!visible.some((value) => value.id === focusedId) &&
                      index === 0)
                      ? 0
                      : -1
                  }
                  onFocus={() => setFocusedId(item.id)}
                  onClick={() => select(item)}
                  onKeyDown={(event) => {
                    const offset =
                      event.key === 'ArrowDown'
                        ? 1
                        : event.key === 'ArrowUp'
                          ? -1
                          : 0;
                    if (offset) {
                      event.preventDefault();
                      rowRefs.current
                        .get(
                          visible[
                            Math.max(
                              0,
                              Math.min(visible.length - 1, index + offset),
                            )
                          ].id,
                        )
                        ?.focus();
                    } else if (event.key === 'Home' || event.key === 'End') {
                      event.preventDefault();
                      rowRefs.current
                        .get(
                          visible[event.key === 'Home' ? 0 : visible.length - 1]
                            .id,
                        )
                        ?.focus();
                    }
                  }}
                >
                  {avatar(item)}
                  <span className="quality-inbox-copy">
                    <span className="quality-inbox-meta">
                      <strong>{authorName(item)}</strong>
                      <time dateTime={item.createdAt} title={item.fullTime}>{item.time}</time>
                    </span>
                    <span className="quality-inbox-title">
                      {item.title}
                    </span>
                    <span className="quality-inbox-excerpt">{item.text}</span>
                    <small>{item.context}</small>
                  </span>
                  {!isRead(item) && (
                    <span className="quality-inbox-unread-dot" />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {!visible.length && (
            <div className="quality-inbox-empty">
              <Inbox size={26} />
              <h3>
                {query
                  ? 'No matching messages'
                  : unreadOnly
                    ? 'No unread messages'
                    : !loaded
                      ? online ? 'Loading inbox…' : 'Waiting for the workspace'
                      : 'No messages'}
              </h3>
              {query && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setQuery('')}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </section>
        <section
          className="quality-inbox-detail"
          id="quality-inbox-detail"
          aria-label="Message details"
        >
          {selected ? (
            <>
              <header className="quality-inbox-detail-toolbar">
                <button
                  className="quality-inbox-back"
                  aria-label="Back to inbox"
                  onClick={() => {
                    setSelectedId(null);
                    requestAnimationFrame(() => (rowRefs.current.get(selected.id) || rowRefs.current.get(visible[0]?.id))?.focus());
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <span>{selected.context}</span>
                <button
                  className="quality-inbox-read-action"
                  onClick={() =>
                    setRead((current) =>
                      isRead(selected)
                        ? current.filter((id) => id !== selected.id && id !== selected.sourceId)
                        : [...current, selected.id],
                    )
                  }
                >
                  {isRead(selected) ? (
                    <Mail size={16} />
                  ) : (
                    <MailOpen size={16} />
                  )}
                  Mark {isRead(selected) ? 'unread' : 'read'}
                </button>
              </header>
              <article className="quality-inbox-message">
                <div className="quality-inbox-message-author">
                  {avatar(selected)}
                  <strong>{authorName(selected)}</strong>
                  <time dateTime={selected.createdAt} title={selected.fullTime}>{selected.time}</time>
                </div>
                <h2 ref={detailHeading} tabIndex={-1}>
                  {selected.title}
                </h2>
                <p>{selected.text}</p>
                <button
                  className="btn btn-primary"
                  disabled={selected.kind === 'mention' && selected.channel.startsWith('thread:')}
                  title={selected.kind === 'mention' && selected.channel.startsWith('thread:') ? 'The parent conversation is not loaded yet.' : undefined}
                  onClick={() => {
                    markRead(selected.id);
                    if (selected.approvalId) reviewDraft(selected.approvalId);
                    else openRoom(selected.channel.startsWith('dm:') ? selected.channel.slice(3) : selected.channel, selected.threadId);
                  }}
                >
                  {selected.kind === 'review'
                    ? selected.approvalStatus === 'Pending' ? 'Review action' : 'View decision'
                    : 'Open conversation'}
                  <ArrowUpRight size={15} />
                </button>
              </article>
            </>
          ) : (
            <div className="quality-inbox-empty">
              <Inbox size={28} />
              <h2>Select a message</h2>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
