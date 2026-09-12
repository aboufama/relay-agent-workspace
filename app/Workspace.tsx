'use client';
import { AgentAvatar, setAgentActivity, type AgentActivity } from '@/components/AgentAvatar';
import { HuddlesView } from './components/HuddlesView';
import { useWorkspaceMembers, type WorkspaceMember, type AgentMember } from '@/lib/workspace-members';
import { buzz, useBuzz } from '@/lib/buzz/store';
import type { MessageRecord, Packet, RunMode, RunRecord } from '@/lib/buzz/types';
import { LiveComposer } from './LiveComposer';
import './live-chat.css';
import { ChatHeader } from '@/components/buzz/ChatHeader';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, SyntheticEvent, CSSProperties } from 'react';
import {
  Activity,
  Archive,
  AtSign,
  Bot,
  Bold,
  Code,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cpu,
  Database,
  FileText,
  Hash,
  Inbox,
  Info,
  Layers3,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Users,
  ThumbsUp,
  X,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  SidebarProvider,
  useSidebar,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataView } from './components/DataView';
import { AgentsView } from './components/AgentsView';
import { ComputeView } from './components/ComputeView';
import { ProjectsView } from './components/ProjectsView';
import { WorkflowsView } from './components/WorkflowsView';
import { ForumView } from './components/ForumView';

type View =
  | 'chat'
  | 'inbox'
  | 'agents'
  | 'data'
  | 'compute'
  | 'projects'
  | 'workflows'
  | 'forum'
  | 'huddles'
  | 'activity'
  | 'settings';
type Message = MessageRecord & {
  initials: string;
  tone: string;
  time: string;
  agent?: 'local' | 'cloud';
  character?: AgentMember['character'];
};
const ACTIVE_RUN = new Set<RunRecord['status']>(['queued', 'preparing', 'running']);
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
/** Activity for an agent, derived from its most recent run. */
function agentActivity(agent: AgentMember, runs: readonly RunRecord[]): AgentActivity {
  if (agent.paused) return 'paused';
  const last = runs
    .filter((run) => run.agentId === agent.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!last) return 'ready';
  return ACTIVE_RUN.has(last.status) ? 'working' : last.status === 'failed' ? 'blocked' : 'ready';
}
function messageText(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|@[\w-]+)/g).map((part, index) =>
    part.startsWith('**') ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : part.startsWith('@') ? (
      <span className="mention" key={index}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function NavigationContent({ children }: { children: ReactNode }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarContent
      className="rail-content"
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('.rail-link')
        )
          setOpenMobile(false);
      }}
    >
      {children}
    </SidebarContent>
  );
}
export function Workspace() {
  const members = useWorkspaceMembers();
  const { messages: allMessages, channels: storeChannels, runs, online } = useBuzz();
  const [, setMentionedIds] = useState<string[]>([]);
  const [memberProfile, setMemberProfile] = useState<WorkspaceMember | null>(null);
  const [view, setView] = useState<View>('chat');
  const [channel, setChannel] = useState('launch-room');
  // Channels exist server-side once they hold a message; new empty ones live here until then.
  const [localChannels, setLocalChannels] = useState<string[]>([]);
  const channels = useMemo(
    () => [...storeChannels, ...localChannels.filter((name) => !storeChannels.includes(name))],
    [storeChannels, localChannels],
  );
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const messages = useMemo(
    () =>
      allMessages
        .filter((message) => message.room === channel)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((message): Message => {
          const member = memberById.get(message.memberId);
          return {
            ...message,
            initials: member?.initials ?? message.name.slice(0, 2),
            tone: member?.tone || 'mint',
            time: formatTime(message.createdAt),
            agent: member?.kind === 'agent' ? member.runtime : undefined,
            character: member?.kind === 'agent' ? member.character : undefined,
          };
        }),
    [allMessages, channel, memberById],
  );
  useEffect(() => {
    for (const member of members)
      if (member.kind === 'agent') setAgentActivity(member.name, agentActivity(member, runs));
  }, [members, runs]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<RunMode>('quick');
  const [toast, setToast] = useState('');
  const [thread, setThread] = useState<Message | null>(null);
  const [starred, setStarred] = useState(false);
  const [tab, setTab] = useState('messages');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newChannel, setNewChannel] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [canvas, setCanvas] = useState(
    '# Launch room\n\nDecision log\n- Confirm handoff window\n- Review customer draft\n- Keep launch checklist current',
  );
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<{ id: string; version: number } | null>(null);
  const reviewApproval = (id: string) => {
    setReviewRequest((current) => ({ id, version: (current?.version ?? 0) + 1 }));
    setView('workflows');
  };
  const [replies, setReplies] = useState<Record<string, string[]>>({});
  const [preferences, setPreferences] = useState([true, false, true]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(
    {},
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('relay-workspace-v1');
        if (saved) {
          const data = JSON.parse(saved) as {
            replies?: Record<string, string[]>;
            reactions?: Record<string, number>;
            preferences?: boolean[];
            canvas?: string;
            draft?: string;
          };
          if (data.replies) setReplies(data.replies);
          if (data.reactions) setReactionCounts(data.reactions);
          if (data.preferences?.length === 3) setPreferences(data.preferences);
          if (typeof data.canvas === 'string') setCanvas(data.canvas);
          if (typeof data.draft === 'string') setDraft(data.draft);
        }
      } catch {
        /* Preferences are optional if storage is unavailable. */
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    try { setMode(localStorage.getItem(`shoal-mode:${channel}`) === 'deep' ? 'deep' : 'quick'); }
    catch { setMode('quick'); }
  }, [channel]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        'relay-workspace-v1',
        JSON.stringify({
          replies,
          reactions: reactionCounts,
          preferences,
          canvas,
          draft,
        }),
      );
    } catch {
      /* Session state remains usable if browser storage is full. */
    }
  }, [hydrated, replies, reactionCounts, preferences, canvas, draft]);
  const currentRef = useRef({ channel, view, channels, online });
  useEffect(() => {
    currentRef.current = { channel, view, channels, online };
  }, [channel, view, channels, online]);
  const [dm, setDm] = useState<string | null>(null);
  const [threadReply, setThreadReply] = useState('');
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (!preferences[2]) return;
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preferences]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool?: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const allowed = new Set<View>([
      'chat',
      'inbox',
      'agents',
      'data',
      'compute',
      'projects',
      'workflows',
      'forum',
      'huddles',
      'activity',
      'settings',
    ]);
    const result = (value: unknown) => ({
      content: [{ type: 'text', text: JSON.stringify(value) }],
    });
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'navigate_workspace',
            description: 'Navigate the Shoal workspace.',
            inputSchema: {
              type: 'object',
              properties: { view: { type: 'string', enum: [...allowed] } },
              required: ['view'],
            },
            execute: async (
              input: unknown,
              options?: { signal?: AbortSignal },
            ) => {
              const next = (input as { view?: unknown })?.view;
              if (
                options?.signal?.aborted ||
                typeof next !== 'string' ||
                !allowed.has(next as View)
              )
                throw new Error('Invalid workspace view');
              setView(next as View);
              return result({ view: next });
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_workspace',
            description: 'Read a non-sensitive summary of the Shoal workspace.',
            inputSchema: { type: 'object', properties: {} },
            execute: async (
              _input: unknown,
              options?: { signal?: AbortSignal },
            ) => {
              if (options?.signal?.aborted) throw new Error('Aborted');
              const { online, ...current } = currentRef.current;
              return result({ workspace: 'Shoal', ...current, serversConnected: online });
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
    } catch {
      /* WebMCP is optional and browser support is not assumed. */
    }
    return () => controller.abort();
  }, []);
  const notify = (message: string) => setToast(message);
  const navigate = (next: string) => {
    setView(next as View);
  };
  const results = search.trim()
    ? messages.filter((message) =>
        `${message.name} ${message.body}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : messages;
  function openRoom(name: string) {
    const member = members.find(person => person.id === name || person.name === name);
    setChannel(member ? `dm:${member.id}` : name);
    setDm(member?.id ?? null);
    setDraft('');
    setMentionedIds([]);
    setTab('messages');
    setView('chat');
  }
  function post(room: string, text: string, restore?: string) {
    buzz.sendMessage(room, text, crypto.randomUUID(), mode).catch((error: unknown) => {
      if (restore !== undefined) setDraft(restore);
      notify(error instanceof Error ? error.message : 'Message not sent. Try again.');
    });
  }
  function retryMessage(message: Message) {
    if (!message.runId) return notify('No recorded run to retry.');
    buzz.retryRun(message.runId).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : 'Could not retry the run.');
    });
  }
  function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMentionedIds([]);
    post(channel, text, text);
  }
  function addChannel(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = channelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    setLocalChannels((items) => (items.includes(name) ? items : [...items, name]));
    setDm(null);
    setChannel(name);
    setChannelName('');
    setNewChannel(false);
    setView('chat');
  }
  const nav = (
    icon: ReactNode,
    label: string,
    target: View,
    count?: string,
  ) => (
    <SidebarMenuItem key={label}>
      <SidebarMenuButton
        className="rail-link"
        data-active={view === target}
        onClick={() => navigate(target)}
      >
        {icon}
        <span>{label}</span>
        {count && <span className="nav-count">{count}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
  return (
    <SidebarProvider
      defaultOpen
      className={`relay-shell ${preferences[1] ? 'compact' : ''}`}
    >
      {preferences[1] && (
        <style>{`.relay-shell.compact .message-row{padding-top:6px;padding-bottom:6px}.relay-shell.compact .message-body p{line-height:1.35}.relay-shell.compact .avatar{width:30px;height:30px}`}</style>
      )}
      <Sidebar className="relay-sidebar" collapsible="offcanvas">
        <SidebarHeader className="rail-header">
          <div className="brand">
            <span className="brand-symbol">
              <Zap size={19} />
            </span>
            Shoal<span className="brand-period">.</span>
            <span className="brand-version">PREVIEW</span>
          </div>
          <button
            className="workspace-switch"
            onClick={() => setProfileOpen(true)}
          >
            <span className="workspace-avatar">M</span>
            <span>
              <strong>Shoal</strong>
              <small>Workspace</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </SidebarHeader>
        <NavigationContent>
          <button className="rail-search" onClick={() => setSearchOpen(true)}>
            <Search size={16} />
            <span>Search</span>
            <kbd>⌘ K</kbd>
          </button>
          <SidebarMenu>
            {nav(<Inbox size={17} />, 'Inbox', 'inbox', '2')}
            {nav(<Bot size={17} />, 'Agents', 'agents')}
            {nav(<Database size={17} />, 'Data', 'data')}
            {nav(<Cpu size={17} />, 'Compute', 'compute')}
          </SidebarMenu>
          <div className="rail-section-label">
            <span>CHANNELS</span>
            <button
              className="icon-btn"
              aria-label="New channel"
              onClick={() => setNewChannel(true)}
            >
              <Plus size={15} />
            </button>
          </div>
          <SidebarMenu>
            {channels.map((name) => (
              <SidebarMenuItem key={name}>
                <SidebarMenuButton
                  className="rail-link"
                  data-active={view === 'chat' && channel === name}
                  onClick={() => {
                    openRoom(name);
                  }}
                >
                  <Hash size={16} />
                  <span>{name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="rail-section-label">
            <span>WORKSPACE</span>
          </div>
          <SidebarMenu>
            {nav(<Layers3 size={16} />, 'Projects', 'projects')}
            {nav(<Sparkles size={16} />, 'Workflows', 'workflows', '1')}
            {nav(<MessageCircle size={16} />, 'Forum', 'forum')}
            {nav(<Users size={16} />, 'Huddles', 'huddles')}
            {nav(<Activity size={16} />, 'Activity', 'activity')}
            {nav(<Settings size={16} />, 'Settings', 'settings')}
          </SidebarMenu>
          <div className="rail-section-label">
            <span>DIRECT MESSAGES</span>
            <button
              className="icon-btn"
              aria-label="New direct message"
              onClick={() => setPeopleOpen(true)}
            >
              <Plus size={15} />
            </button>
          </div>
          <SidebarMenu>
            {members.filter(member=>member.id!=='you').map((p) => (
              <SidebarMenuItem key={p.id}>
                <SidebarMenuButton
                  className="rail-link"
                  onClick={() => openRoom(p.id)}
                >
                  <span className="tiny-avatar">{p.kind==='agent'?<AgentAvatar character={p.character} label={p.name} size={24}/>:p.initials}</span>
                  <span>{p.name.split(' ')[0]}</span>
                  <span className="rail-dot" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </NavigationContent>
        <SidebarFooter className="rail-footer">
          <button className="compute-mini" onClick={() => navigate('compute')}>
            <Cpu size={17} className="compute-chip" />
            <span>
              <strong>Dell GB10</strong>
              <small>
                <span className="status-dot amber" /> Not connected
              </small>
            </span>
          </button>
          <div className="rail-profile">
            <button onClick={() => setProfileOpen(true)}>
              <span className="tiny-avatar you-avatar">YO</span>
              <span>
                <strong>Your profile</strong>
                <small>Local</small>
              </span>
            </button>
            <button
              className="icon-btn"
              aria-label="Help"
              onClick={() =>
                notify('Use @ to mention a member, or open a direct message.')
              }
            >
              <CircleHelp size={16} />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="workspace-main">
        {!online && (
          <div className="relay-offline" role="status" style={{ padding: '6px 30px', fontSize: '.75rem', color: '#7e7e7e', background: '#f7f7f7', borderBottom: '1px solid #ededed' }}>
            Offline — reconnecting to the workspace…
          </div>
        )}
        <header
          className="topbar"
          style={{ display: view === 'chat' ? 'none' : undefined }}
        >
          <div className="breadcrumbs">
            <SidebarTrigger className="mobile-menu" />
            <strong>
              {view === 'chat'
                ? `${dm ? '@' : '#'} ${channel}`
                : view[0].toUpperCase() + view.slice(1)}
            </strong>
            <span>/</span>
            <span>Shoal</span>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => navigate('inbox')}
            >
              <AtSign size={17} />
              <span className="notification-dot" />
            </button>
            <button
              className="top-profile"
              onClick={() => setProfileOpen(true)}
              aria-label="Open profile"
            >
              YO
            </button>
          </div>
        </header>
        <div
          style={{ display: view === 'chat' ? 'contents' : 'none' }}
          aria-hidden={view !== 'chat'}
        >
          <Chat
            channel={members.find(member=>member.id===dm)?.name ?? channel}
            room={channel}
            members={members}
            onMention={id=>setMentionedIds(ids=>ids.includes(id)?ids:[...ids,id])}
            retry={retryMessage}
            openMember={member=>setMemberProfile(member)}
            dm={!!dm}
            invite={() => setPeopleOpen(true)}
            reactionCounts={reactionCounts}
            react={(id) =>
              setReactionCounts((all) => ({ ...all, [id]: (all[id] || 0) + 1 }))
            }
            replies={replies}
            tab={tab}
            setTab={setTab}
            messages={messages}
            draft={draft}
            setDraft={setDraft}
            send={send}
            mode={mode}
            setMode={(value) => { setMode(value); try { localStorage.setItem(`shoal-mode:${channel}`, value); } catch { /* The choice still works for this session. */ } }}
            starred={starred}
            setStarred={setStarred}
            setThread={setThread}
            canvas={canvas}
            setCanvas={setCanvas}
            navigate={navigate}
            notify={notify}
          />
        </div>
        <View
          view={view}
          navigate={navigate}
          notify={notify}
          preferences={preferences}
          setPreferences={setPreferences}
          reviewApproval={reviewApproval}
          reviewRequest={reviewRequest}
        />
      </main>
      <Sheet open={!!thread} onOpenChange={(open) => !open && setThread(null)}>
        <SheetContent className="thread-sheet">
          <SheetHeader>
            <SheetTitle>Thread</SheetTitle>
            <SheetDescription className="sr-only">Replies</SheetDescription>
          </SheetHeader>
          {thread && (
            <>
              <div className="thread-original">
                <strong>{thread.name}</strong>
                <div className="message-text">{messageText(thread.body)}</div>
              </div>
              <div className="thread-replies">
                {(replies[thread.id] || []).map((reply, index) => (
                  <div className="thread-reply" key={index}>
                    <strong>You</strong>
                    <p>{reply}</p>
                  </div>
                ))}
                {!replies[thread.id]?.length && (
                    <p className="muted">
                      No replies yet. Start the conversation.
                    </p>
                  )}
              </div>
              <div className="thread-composer">
                <textarea
                  className="textarea"
                  aria-label="Thread reply"
                  placeholder="Reply in thread…"
                  value={threadReply}
                  onChange={(e) => setThreadReply(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (!threadReply.trim()) return;
                    setReplies((all) => ({
                      ...all,
                      [thread.id]: [
                        ...(all[thread.id] || []),
                        threadReply.trim(),
                      ],
                    }));
                    setThreadReply('');
                  }}
                >
                  Reply
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-dialog">
          <DialogHeader>
            <DialogTitle>Search Shoal</DialogTitle>
            <DialogDescription className="sr-only">
              Search messages.
            </DialogDescription>
          </DialogHeader>
          <div className="search-input">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
            />
            <kbd>ESC</kbd>
          </div>
          <div className="search-results">
            {results.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSearchOpen(false);
                  setThread(m);
                }}
              >
                <span className={`tiny-avatar ${m.tone}`}>{m.initials}</span>
                <span>
                  <strong>
                    {m.name}: {m.body}
                  </strong>
                  <small>
                    #{channel} · {m.time}
                  </small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={peopleOpen} onOpenChange={setPeopleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Members</DialogTitle>
            <DialogDescription className="sr-only">
              Choose a conversation.
            </DialogDescription>
          </DialogHeader>
          {members.filter(person=>person.id!=='you').map((person) => (
            <button
              className="list-row"
              key={person.id}
              onClick={() => {
                openRoom(person.id);
                setPeopleOpen(false);
              }}
            >
              <span className="avatar">{person.kind==='agent'?<AgentAvatar character={person.character} label={person.name} size={32}/>:person.initials}</span>
              <strong>{person.name}</strong><span className="member-directory-type">{person.kind==='agent'?'Agent':'Person'}</span>
              <MessageCircle size={16} />
            </button>
          ))}
        </DialogContent>
      </Dialog>
      <Dialog open={newChannel} onOpenChange={setNewChannel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a channel</DialogTitle>
            <DialogDescription className="sr-only">
              Name your channel.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addChannel}>
            <label className="field">
              <span className="field-label">Channel name</span>
              <input
                className="input"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. product-launch"
              />
            </label>
            <DialogFooter>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setNewChannel(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" type="submit">
                Create channel
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!memberProfile} onOpenChange={open=>!open&&setMemberProfile(null)}>
        <DialogContent><DialogHeader><DialogTitle>{memberProfile?.name}</DialogTitle><DialogDescription>{memberProfile?.kind==='agent'?'Workspace agent':'Workspace member'}</DialogDescription></DialogHeader>
          {memberProfile?.kind==='agent'&&<><AgentAvatar character={memberProfile.character} label={memberProfile.name} size={48}/><p>{memberProfile.description}</p><p className="muted">{memberProfile.runtime==='local'?'Local · GB10':'Cloud'} · {memberProfile.model}</p></>}
          <DialogFooter><button className="btn btn-secondary" onClick={()=>{if(memberProfile)openRoom(memberProfile.id);setMemberProfile(null)}}>Message</button>{memberProfile?.kind==='agent'&&<button className="btn btn-primary" onClick={()=>{const agentId=memberProfile?.id;setMemberProfile(null);navigate('agents');requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('relay:open-agent',{detail:{agentId}})))}}>Agent settings</button>}</DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <div className="profile-preview">
            <span className="avatar you-avatar">YO</span>
            <DialogTitle>Your profile</DialogTitle>
            <p className="muted">Shoal workspace</p>
          </div>
          <DialogFooter>
            <button
              className="btn btn-secondary"
              onClick={() => setProfileOpen(false)}
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {toast && (
        <div className="relay-toast">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button
            className="icon-btn"
            aria-label="Dismiss"
            onClick={() => setToast('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </SidebarProvider>
  );
}

function Chat({
  members, onMention, retry, openMember, room,
  dm,
  invite,
  reactionCounts,
  react,
  replies,
  channel,
  tab,
  setTab,
  messages,
  draft,
  setDraft,
  send,
  mode,
  setMode,
  starred,
  setStarred,
  setThread,
  canvas,
  setCanvas,
  navigate,
  notify,
}: {
  members: readonly WorkspaceMember[];
  onMention:(id:string)=>void;
  retry:(message:Message)=>void;
  openMember:(member:WorkspaceMember)=>void;
  room: string;
  dm: boolean;
  invite: () => void;
  reactionCounts: Record<string, number>;
  react: (id: string) => void;
  replies: Record<string, string[]>;
  channel: string;
  tab: string;
  setTab: (value: string) => void;
  messages: Message[];
  draft: string;
  setDraft: (value: string) => void;
  send: () => void;
  mode: RunMode;
  setMode: (mode: RunMode) => void;
  starred: boolean;
  setStarred: (value: boolean) => void;
  setThread: (message: Message) => void;
  canvas: string;
  setCanvas: (value: string) => void;
  navigate: (value: string) => void;
  notify: (message: string) => void;
}) {
  const [contextOpen, setContextOpen] = useState(false);
  const [composerMenu, setComposerMenu] = useState(false);
  const { runs, documents, tasks, projects, loaded } = useBuzz();
  const [packet, setPacket] = useState<{ runId: string; packet: Packet | null } | null>(null);
  const roomRuns = useMemo(
    () => runs.filter((run) => run.room === room).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [runs, room],
  );
  const latestRun = roomRuns[0];
  const agents = members.filter((member): member is AgentMember => member.kind === 'agent');
  const roomAgents = roomRuns.length ? agents.filter((agent) => roomRuns.some((run) => run.agentId === agent.id)) : agents;
  const projectId = room === 'launch-room' ? 'launch' : room === 'engineering' ? 'platform' : null;
  const project = projects.find((item) => item.id === projectId);
  const projectTasks = project ? tasks.filter((task) => task.project === project.id) : [];
  const projectDone = projectTasks.filter((task) => task.status === 'Done').length;
  const projectPercent = projectTasks.length ? Math.round((projectDone / projectTasks.length) * 100) : 0;
  const viewContext = (id: string) => {
    if (packet?.runId === id) return setPacket(null);
    buzz.inspectRun(id).then((r) => setPacket({ runId: id, packet: r.run.packet ?? null })).catch((error: unknown) => notify(error instanceof Error ? error.message : 'Could not load the run context.'));
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [channel, messages, tab]);
  const insertText = (text: string) => {
    const field = composerRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + text + draft.slice(end));
    field?.focus();
  };
  const formatSelection = () => {
    const field = composerRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? draft.length;
    const selection = draft.slice(start, end) || 'bold text';
    insertText(`**${selection}**`);
  };

  return (
    <section className="chat-page">
      <ChatHeader
        title={channel}
        leadingContent={
          <>
            <SidebarTrigger className="mobile-menu" />
            {dm ? <AtSign size={16} /> : <Hash size={16} />}
          </>
        }
        titleAdornment={
          <button
            className={`icon-btn star-button ${starred ? 'starred' : ''}`}
            aria-label="Star channel"
            onClick={() => setStarred(!starred)}
          >
            <Star size={15} fill={starred ? 'currentColor' : 'none'} />
          </button>
        }
        actions={
          <div className="channel-actions">
            <div className="member-stack">
              {members.slice(0,3).map((p) => (
                <span key={p.id} className={`tiny-avatar ${p.tone}`}>
                  {p.initials}
                </span>
              ))}
              <span className="member-number">{members.length}</span>
            </div>
            <button className="btn btn-secondary desktop-only" onClick={invite}>
              {' '}
              <Users size={15} /> People
            </button>
            <button
              className="icon-btn"
              aria-label="Toggle room context"
              aria-expanded={contextOpen}
              onClick={() => setContextOpen(!contextOpen)}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        }
      />
      <div className="channel-tab-row">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="channel-tabs">
            <TabsTrigger value="messages">
              <MessageCircle size={14} />
              Messages
            </TabsTrigger>
            <TabsTrigger value="canvas">
              <FileText size={14} />
              Canvas
            </TabsTrigger>
            <TabsTrigger value="files">
              <Archive size={14} />
              Files
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === 'messages' ? (
        <div
          className={`conversation-layout ${contextOpen ? 'context-open' : ''}`}
          style={{
            gridTemplateColumns: contextOpen ? undefined : 'minmax(0, 1fr)',
          }}
        >
          <div className="conversation">
            <div className="conversation-scroll" ref={scrollRef}>
              {!loaded ? (
                <p className="muted small page-note">Loading workspace…</p>
              ) : (
                <div className="date-divider">Today</div>
              )}
              {messages.map((m, index) => (
                <article
                  className={`message-row ${messages[index - 1]?.name === m.name ? 'message-grouped' : ''}`}
                  key={m.id}
                >
                  {m.agent ? <AgentAvatar character={m.character ?? 'worm'} state="idle" size={32} label={m.name} className="message-agent-avatar" /> : <span className={`avatar ${m.tone}`}>{m.initials}</span>}
                  <div className="message-body">
                    <div className="message-meta">
                      <button className="member-name-button" onClick={()=>{const member=members.find(person=>person.id===m.memberId||person.name===m.name);if(member)openMember(member)}}>{m.name}</button>
                      {m.agent && (
                        <span
                          className={`badge ${m.agent === 'local' ? 'badge-green' : 'badge-blue'}`}
                        >
                          Agent
                        </span>
                      )}
                      <time>{m.time}</time>
                    </div>
                    <div className="message-text">{messageText(m.body)}</div>
                    {m.state==='pending'&&<output className="message-request-state">{({ queued: 'Queued', preparing: 'Preparing context', running: 'Working', awaiting: 'Waiting for review', completed: 'Finishing', failed: 'Failed', cancelled: 'Cancelled' } as const)[runs.find((run) => run.id === m.runId)?.status ?? 'queued']}</output>}
                    {m.state==='complete' && m.runId && runs.find((r) => r.id === m.runId)?.mode === 'quick' && <button className="btn btn-ghost" onClick={() => buzz.retryRun(m.runId!, 'deep').catch((error: Error) => notify(error.message))}>Go deeper</button>}
                    {m.state==='error'&&<div className="message-request-state message-request-error" role="alert">{m.error || 'The agent could not respond.'}<button onClick={()=>retry(m)}>Retry</button></div>}
                    {m.attachment && (
                      <button
                        className="chat-attachment"
                        onClick={() => navigate('data')}
                      >
                        <FileText size={22} />
                        <span>
                          <strong>{m.attachment.name}</strong>
                          <small>{m.attachment.detail}</small>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                    <div className="message-reactions">
                      {(reactionCounts[m.id] || 0) > 0 && (
                        <button
                          className="reaction"
                          onClick={() => react(m.id)}
                        >
                          <ThumbsUp size={12} /> {reactionCounts[m.id]}
                        </button>
                      )}
                      {(replies[m.id]?.length || 0) > 0 && (
                        <button
                          className="reply-action"
                          onClick={() => setThread(m)}
                        >
                          <MessageCircle size={13} />
                          {replies[m.id].length}{' '}
                          {replies[m.id].length === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="message-tools">
                    <button
                      className="icon-btn"
                      aria-label="React"
                      onClick={() => react(m.id)}
                    >
                      <Smile size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Reply"
                      onClick={() => setThread(m)}
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="composer-wrap">
              <div className="composer">
                <LiveComposer ref={composerRef} value={draft} onChange={setDraft} onSend={send} members={members} onMention={onMention} placeholder={`Message ${dm?'@':'#'}${channel}`} />
                <div className="composer-bottom">
                  <div role="group" aria-label="Response mode">
                    {(['quick', 'deep'] as const).map((value) => (
                      <button key={value} type="button" aria-pressed={mode === value}
                        className={`btn ${mode === value ? 'btn-primary' : 'btn-ghost'}`}
                        title={value === 'quick' ? 'A focused answer with a smaller context budget' : 'More context and investigation time; the same protected tools'}
                        onClick={() => setMode(value)}>
                        {value === 'quick' ? 'Quick' : 'Deep'}
                      </button>
                    ))}
                  </div>
                  <div>
                    <button
                      className="icon-btn"
                      aria-label="Message actions"
                      aria-expanded={composerMenu}
                      onClick={() => setComposerMenu(!composerMenu)}
                    >
                      <Plus size={16} />
                    </button>
                    {composerMenu && (
                      <div className="composer-menu">
                        <button
                          onClick={() => {
                            navigate('data');
                            setComposerMenu(false);
                          }}
                        >
                          <Paperclip size={14} /> Browse files
                        </button>
                        <button
                          onClick={() => {
                            insertText('`code`');
                            setComposerMenu(false);
                          }}
                        >
                          <Code size={14} /> Insert code
                        </button>
                      </div>
                    )}
                    <button
                      className="icon-btn"
                      aria-label="Mention teammate"
                      onClick={() => insertText('@')}
                    >
                      <AtSign size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Bold text"
                      onClick={formatSelection}
                    >
                      <Bold size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Attach file"
                      onClick={() => navigate('data')}
                    >
                      <Paperclip size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Add emoji"
                      onClick={() => setDraft(`${draft} 🙂`)}
                    >
                      <Smile size={16} />
                    </button>
                    <span className="composer-divider" />
                  </div>
                  <button
                    className="send-button"
                    aria-label="Send message"
                    disabled={!draft.trim()}
                    onClick={send}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {contextOpen && (
            <aside className="context-panel">
              <div className="context-heading">
                <h2>Room context</h2>
                <button
                  className="icon-btn"
                  aria-label="Context info"
                  onClick={() => notify('Room details')}
                >
                  <Info size={15} />
                </button>
              </div>
              <div className="context-section">
                <div className="context-label">
                  <span>AGENTS IN THIS ROOM</span>
                  <button onClick={() => navigate('agents')}>View all</button>
                </div>
                {roomAgents.map((agent) => {
                  const activity = agentActivity(agent, runs);
                  return (
                    <button className="context-agent" key={agent.id} onClick={() => navigate('agents')}>
                      <AgentAvatar character={agent.character} state="idle" size={32} label={agent.name} />
                      <span>
                        <strong>
                          {agent.name} <span className={`tiny-route ${agent.runtime}`}>{agent.runtime.toUpperCase()}</span>
                        </strong>
                        <small>{agent.role || 'Agent'} · {activity}</small>
                      </span>
                      <span className={`status-dot ${activity === 'working' ? 'blue' : activity === 'blocked' ? 'amber' : 'green'}`} />
                    </button>
                  );
                })}
                <button
                  className="add-agent-link"
                  onClick={() => navigate('agents')}
                >
                  <Plus size={14} /> Invite an agent
                </button>
              </div>
              {latestRun && (
                <div className="context-section">
                  <div className="context-label">
                    <span>LATEST RUN</span>
                    <button onClick={() => viewContext(latestRun.id)}>{packet?.runId === latestRun.id ? 'Hide context' : 'View context'}</button>
                  </div>
                  <div className="context-agent">
                    <span className="document-icon"><Activity size={15} /></span>
                    <span>
                      <strong>{members.find((member) => member.id === latestRun.agentId)?.name ?? latestRun.agentId} <span className="badge">{latestRun.status}</span></strong>
                      <small>{latestRun.model || latestRun.backend} · {latestRun.inputTokens ?? 0} in / {latestRun.outputTokens ?? 0} out</small>
                      {latestRun.error && <small>{latestRun.error}</small>}
                    </span>
                  </div>
                  {packet?.runId === latestRun.id && (
                    <div className="context-note" style={{ margin: '0 0 8px', flexDirection: 'column', gap: 4 }}>
                      {packet.packet ? (
                        <>
                          <p>Submitted context: ~{packet.packet.estimatedTokens} of {packet.packet.budgetTokens} tokens · rules v{packet.packet.rulesVersion}</p>
                          <p>{packet.packet.historyMessages} history messages{packet.packet.droppedHistory ? ` (${packet.packet.droppedHistory} dropped)` : ''}</p>
                          <p>{packet.packet.evidence.length} evidence passages{packet.packet.droppedEvidence ? ` (${packet.packet.droppedEvidence} dropped)` : ''}</p>
                          {packet.packet.evidence.map((passage) => (
                            <p key={passage.chunkId}>· {passage.documentName} §{passage.idx + 1}</p>
                          ))}
                        </>
                      ) : (
                        <p>No context packet recorded for this run yet.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="context-section">
                <div className="context-label">
                  <span>DOCUMENTS</span>
                  <button onClick={() => setTab('files')}>See all</button>
                </div>
                {documents.length === 0 && <p className="small muted">No documents yet.</p>}
                {documents.slice(0, 4).map((document) => (
                  <button
                    className="context-document"
                    key={document.id}
                    onClick={() => navigate('data')}
                  >
                    <span className={`document-icon ${document.status === 'ready' ? 'green' : document.status === 'failed' ? '' : 'amber'}`}>
                      <FileText size={15} />
                    </span>
                    <span>
                      <strong>{document.name}</strong>
                      <small>
                        <Users size={10} /> {document.collection} · {document.status}
                      </small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
              {project && (
                <div className="launch-card">
                  <div>
                    <span className="badge badge-blue">PROJECT</span>
                    <MoreHorizontal size={15} />
                  </div>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <div className="progress-track">
                    <span className="progress-fill" style={{ width: `${projectPercent}%` }} />
                  </div>
                  <div className="launch-progress">
                    <span>{projectDone} of {projectTasks.length} tasks</span>
                    <strong>{projectPercent}%</strong>
                  </div>
                  <button className="btn" onClick={() => navigate('projects')}>
                    Open project <ChevronRight size={13} />
                  </button>
                </div>
              )}
              <div className="context-note">
                <ShieldCheck size={14} />
                <p>
                  Agents can prepare drafts here. People approve external
                  actions.
                </p>
              </div>
            </aside>
          )}
        </div>
      ) : tab === 'canvas' ? (
        <div className="conversation-scroll canvas-panel">
          <div className="eyebrow">SHARED CANVAS · BROWSER ONLY</div>
          <h2>Launch room notes</h2>
          <textarea
            className="canvas-editor"
            value={canvas}
            onChange={(e) => setCanvas(e.target.value)}
            aria-label="Edit shared canvas"
          />
          <p className="small muted page-note">
            Edits are kept in this session and are not uploaded.
          </p>
        </div>
      ) : (
        <div className="conversation-scroll">
          <div className="card shared-file">
            <div className="card-header">
              <h2>Files shared in #{channel}</h2>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('data')}
              >
                <Database size={15} /> Browse Data
              </button>
            </div>
            {documents.length === 0 && <p className="muted small">No documents in the workspace yet.</p>}
            {documents.map((document) => (
              <button
                className="list-row"
                key={document.id}
                onClick={() => navigate('data')}
              >
                <FileText size={17} />
                <span>
                  <strong>{document.name}</strong>
                  <small className="muted">
                    {document.collection} · {document.status}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function View({
  preferences,
  setPreferences,
  reviewApproval,
  reviewRequest,
  view,
  navigate,
  notify,
}: {
  preferences: boolean[];
  setPreferences: (value: boolean[]) => void;
  reviewApproval: (id: string) => void;
  reviewRequest: { id: string; version: number } | null;
  view: View;
  navigate: (view: string) => void;
  notify: (message: string) => void;
}) {
  const hidden = (target: View) => ({
    className: 'view-content',
    style: {
      display: view === target ? 'block' : 'none',
      minHeight: 0,
      overflowY: 'auto',
      flex: 1,
    } as CSSProperties,
    'aria-hidden': view !== target,
  });
  return (
    <>
      <div {...hidden('inbox')}>
        <InboxView reviewApproval={reviewApproval} />
      </div>
      <div {...hidden('agents')}>
        <AgentsView onNotify={notify} onNavigate={navigate} />
      </div>
      <div {...hidden('data')}>
        <DataView onNotify={notify} />
      </div>
      <div {...hidden('compute')}>
        <ComputeView onNotify={notify} />
      </div>
      <div {...hidden('projects')}>
        <ProjectsView onNotify={notify} />
      </div>
      <div {...hidden('workflows')}>
        <WorkflowsView onNotify={notify} reviewRequest={reviewRequest} />
      </div>
      <div {...hidden('forum')}>
        <ForumView onNotify={notify} />
      </div>
      <div {...hidden('huddles')}>
        <HuddlesView />
      </div>
      <div {...hidden('activity')}>
        <ActivityView />
      </div>
      <div {...hidden('settings')}>
        <SettingsView
          navigate={navigate}
          preferences={preferences}
          setPreferences={setPreferences}
        />
      </div>
    </>
  );
}
function InboxView({ reviewApproval }: { reviewApproval: (id: string) => void }) {
  const { approvals, members, loaded } = useBuzz();
  const pending = approvals.filter((approval) => approval.status === 'Pending');
  return (
    <div className="view-content"><div className="page">
      <div className="page-heading"><h1>Inbox</h1><p className="subtitle">Decisions waiting for you.</p></div>
      {pending.map((approval) => (
        <button className="inbox-item" key={approval.id} onClick={() => reviewApproval(approval.id)}>
          <span className="inbox-item-icon amber"><ShieldCheck size={19} /></span>
          <span><strong>{approval.title}</strong><small>{members.find((member) => member.id === approval.agent)?.name ?? approval.agent}{approval.recipient ? ` · ${approval.recipient}` : ''}</small></span>
          <span className="badge badge-amber">Needs review</span><ChevronRight size={17} />
        </button>
      ))}
      {!pending.length && <p className="muted">{loaded ? 'No decisions waiting.' : 'Loading decisions…'}</p>}
    </div></div>
  );
}
function ActivityView() {
  return (
    <div className="view-content">
      <div className="page">
        <div className="page-heading">
          <div className="eyebrow">A CLEAR TRAIL</div>
          <h1>Activity</h1>
          <p className="subtitle">
            Workspace activity.
          </p>
        </div>
        <div className="card activity-list">
          {[
            'Atlas reviewed the launch checklist',
            'Olivia updated the handoff window',
            'Nova prepared a customer update draft',
            'You created the launch-room canvas',
          ].map((x, i) => (
            <div className="activity-row" key={x}>
              <span className={`activity-icon ${i === 2 ? 'amber' : ''}`}>
                <Activity size={17} />
              </span>
              <div>
                <strong>{x}</strong>
                <p>Workspace event</p>
              </div>
              <time>{i + 2}m ago</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function SettingsView({
  navigate,
  preferences,
  setPreferences,
}: {
  navigate: (s: string) => void;
  preferences: boolean[];
  setPreferences: (value: boolean[]) => void;
}) {
  return (
    <div className="view-content">
      <div className="page settings-page">
        <div className="page-heading">
          <div className="eyebrow">MAKE RELAY YOURS</div>
          <h1>Settings</h1>
          <p className="subtitle">
            
          </p>
        </div>
        <div className="card settings-card">
          <h2>Workspace preferences</h2>
          {[
            [
              'Desktop notifications',
              'Get notified when a review or mention needs you.',
            ],
            [
              'Compact conversation density',
              'Show more messages at once in channels.',
            ],
            ['Keyboard shortcuts', 'Use ⌘ K to search and quick navigation.'],
          ].map(([label, desc], i) => (
            <div className="setting-row" key={label}>
              <div>
                <strong>{label}</strong>
                <p>{desc}</p>
              </div>
              <button
                className={`work-toggle ${preferences[i] ? 'is-on' : ''}`}
                role="switch"
                aria-label={label}
                aria-checked={preferences[i]}
                onClick={() => {
                  setPreferences(
                    preferences.map((value, index) =>
                      index === i ? !value : value,
                    ),
                  );
                }}
              >
                <span />
              </button>
            </div>
          ))}
        </div>
        <div className="card settings-card">
          <h2>Connections</h2>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('compute')}
          >
            <Settings size={15} /> Manage connections
          </button>
        </div>
      </div>
    </div>
  );
}
export default Workspace;
