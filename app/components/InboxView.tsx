// List/detail hierarchy adapted from Buzz InboxListPane and InboxDetailPane.
import { useEffect, useRef, useState } from 'react';
import { useBuzz } from '@/lib/buzz/store';
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
import { useWorkspaceMembers } from '@/lib/workspace-members';
import { PageHeader } from '@/components/buzz/PageHeader';
type Item = {
  id: string; authorId: string; kind: 'review' | 'mention'; channel: string;
  time: string; text: string; title: string; createdAt: string; approvalId?: string;
};
type Props = { reviewApproval: (id: string) => void; openRoom: (name: string) => void };
export function InboxView({ reviewApproval, openRoom }: Props) {
  const members = useWorkspaceMembers();
  const { approvals, messages, runs, loaded } = useBuzz();
  const items: Item[] = [
    ...approvals.map(approval => ({
      id: approval.id, approvalId: approval.id,
      authorId: members.find(member => member.id === approval.agent || member.name === approval.agent)?.id || approval.agent,
      kind: 'review' as const,
      channel: runs.find(run => run.id === approval.runId)?.room || approval.workflow || 'Approvals',
      time: new Date(approval.createdAt).toLocaleString(), text: approval.body,
      title: `${approval.title} · ${approval.status}`, createdAt: approval.createdAt,
    })),
    ...messages.filter(message => message.memberId !== 'you' && message.state !== 'pending' && /(^|\s)@you\b/i.test(message.body)).map(message => ({
      id: message.id, authorId: message.memberId, kind: 'mention' as const,
      channel: message.room, time: new Date(message.createdAt).toLocaleString(), text: message.body,
      title: `${message.name} mentioned you`, createdAt: message.createdAt,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => { try { const saved: unknown = JSON.parse(localStorage.getItem('shoal-inbox-read') || '[]'); if (Array.isArray(saved)) queueMicrotask(() => setRead(saved.filter((id): id is string => typeof id === 'string'))); } catch { /* Optional preference. */ } }, []);
  useEffect(() => { if (read.length) { try { localStorage.setItem('shoal-inbox-read', JSON.stringify(read)); } catch { /* Optional preference. */ } } }, [read]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedId, setFocusedId] = useState('');
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const unreadCount = items.filter(
    (item) => !read.includes(item.id),
  ).length;
  const author = (item: Item) =>
    members.find((member) => member.id === item.authorId);
  const authorName = (item: Item) =>
    author(item)?.name || item.authorId;
  const title = (item: Item) => item.title;
  const visible = items.filter(
    (item) =>
      (!unreadOnly || !read.includes(item.id)) &&
      `${title(item)} ${item.text} ${item.channel}`
        .toLowerCase()
        .includes(query.toLowerCase()),
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
    return <MemberAvatar member={member} name={authorName(item)} initials="MR" size={32} />;
  }
  return (
    <div className="page quality-inbox">
      <PageHeader
        className="page-heading"
        title="Inbox"
        action={
          <button
            className="btn btn-secondary"
            onClick={() => setRead(items.map((item) => item.id))}
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
                  className={`quality-inbox-row ${read.includes(item.id) ? 'is-read' : 'is-unread'} ${selectedId === item.id ? 'selected' : ''}`}
                  aria-current={selectedId === item.id ? 'true' : undefined}
                  aria-label={`${title(item)}, ${read.includes(item.id) ? 'read' : 'unread'}`}
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
                      <time>{item.time}</time>
                    </span>
                    <span className="quality-inbox-title">
                      {item.title}
                    </span>
                    <span className="quality-inbox-excerpt">{item.text}</span>
                    <small>{item.channel.startsWith('dm:') ? 'Direct message' : item.channel}</small>
                  </span>
                  {!read.includes(item.id) && (
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
                    : loaded ? 'No messages' : 'Loading inbox…'}
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
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft size={18} />
                </button>
                <span>{selected.channel.startsWith('dm:') ? 'Direct message' : selected.channel}</span>
                <button
                  className="quality-inbox-read-action"
                  onClick={() =>
                    setRead((current) =>
                      current.includes(selected.id)
                        ? current.filter((id) => id !== selected.id)
                        : [...current, selected.id],
                    )
                  }
                >
                  {read.includes(selected.id) ? (
                    <Mail size={16} />
                  ) : (
                    <MailOpen size={16} />
                  )}
                  Mark {read.includes(selected.id) ? 'unread' : 'read'}
                </button>
              </header>
              <article className="quality-inbox-message">
                <div className="quality-inbox-message-author">
                  {avatar(selected)}
                  <strong>{authorName(selected)}</strong>
                  <time>{selected.time}</time>
                </div>
                <h2 ref={detailHeading} tabIndex={-1}>
                  {selected.title}
                </h2>
                <p>{selected.text}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    markRead(selected.id);
                    if (selected.approvalId) reviewApproval(selected.approvalId);
                    else openRoom(selected.channel);
                  }}
                >
                  {selected.kind === 'review' ? 'Review action' : 'Open conversation'}
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
