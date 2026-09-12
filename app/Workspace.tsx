'use client';
import { AgentAvatar, setAgentActivity } from '@/components/AgentAvatar';
import { HuddlesView } from './components/HuddlesView';
import { useWorkspaceMembers, type WorkspaceMember, type AgentMember } from '@/lib/workspace-members';
import { LiveComposer } from './LiveComposer';
import './live-chat.css';
import { ChatHeader } from '@/components/buzz/ChatHeader';

import { isValidElement, useEffect, useRef, useState } from 'react';
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
type Message = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  time: string;
  body: ReactNode;
  agent?: 'local' | 'cloud';
  reactions?: number;
  replies?: number;
  memberId?: string;
  requestState?: 'pending' | 'error' | 'complete';
  error?: string;
  attachment?: { name: string; detail: string };
};
function plainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainText).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node))
    return plainText(node.props.children);
  return '';
}
const seed: Message[] = [
  {
    id: 'm1',
    name: 'Olivia Chen',
    initials: 'OC',
    tone: 'peach',
    time: '9:18 AM',
    body: 'Morning. Moving the Monday launch handoff here so engineering and CS have the same plan.',
    reactions: 3,
  },
  {
    id: 'launch-2',
    name: 'Olivia Chen',
    initials: 'OC',
    tone: 'peach',
    time: '9:19 AM',
    body: 'Latest checklist below. Owners are filled in; the only open question is the customer email timing.',
    attachment: {
      name: 'Launch checklist.md',
      detail: 'Checklist · 8 tasks · updated today',
    },
  },
  {
    id: 'm3',
    name: 'Marcus Reed',
    initials: 'MR',
    tone: 'lavender',
    time: '9:22 AM',
    body: (
      <>
        Can we hold the email until 10:30? I want a full hour between rollout
        and the first customer session. <span className="mention">@Olivia</span>
      </>
    ),
    reactions: 2,
  },
  {
    id: 'launch-4',
    name: 'You',
    initials: 'YO',
    tone: 'you-avatar',
    time: '9:24 AM',
    body: 'Works for me. Let’s make the rollback owner explicit too.',
  },
  {
    id: 'm2',
    name: 'Atlas',
    initials: 'At',
    tone: 'mint',
    time: '9:26 AM',
    agent: 'local',
    body: (
      <>
        <span>Proposed runbook order:</span>
        <ul>
          <li>09:30 — engineering starts the rollout</li>
          <li>10:00 — Marcus reviews the first sessions</li>
          <li>10:30 — Olivia sends the customer note</li>
        </ul>
        <span>Still need a name beside rollback.</span>
      </>
    ),
  },
  {
    id: 'launch-6',
    name: 'Marcus Reed',
    initials: 'MR',
    tone: 'lavender',
    time: '9:28 AM',
    body: 'Put me down for rollback. Adding the feature flag command to the runbook:',
  },
  {
    id: 'launch-7',
    name: 'Marcus Reed',
    initials: 'MR',
    tone: 'lavender',
    time: '9:28 AM',
    body: (
      <pre className="chat-code">
        <code>
          {
            'FEATURE_CUSTOMER_PORTAL=false\n# Keep existing sessions on the current experience'
          }
        </code>
      </pre>
    ),
    reactions: 2,
  },
  {
    id: 'launch-8',
    name: 'Olivia Chen',
    initials: 'OC',
    tone: 'peach',
    time: '9:32 AM',
    body: 'Perfect. CS can cover 10:30. I’ll keep the note focused on what customers can actually do on day one.',
    reactions: 3,
  },
  {
    id: 'launch-9',
    name: 'You',
    initials: 'YO',
    tone: 'you-avatar',
    time: '9:35 AM',
    body: (
      <>
        {' '}
        <span className="mention">@Nova</span> can you tighten the update? Two
        sentences, with the support contact at the end.
      </>
    ),
  },
  {
    id: 'm4',
    name: 'Nova',
    initials: 'No',
    tone: 'lavender',
    time: '9:38 AM',
    agent: 'cloud',
    body: 'Draft: “Your new workspace opens Monday at 10:30. Start with the launch guide, and reply to your account team if you need a hand.”',
    reactions: 2,
  },
  {
    id: 'launch-11',
    name: 'Olivia Chen',
    initials: 'OC',
    tone: 'peach',
    time: '9:40 AM',
    body: 'That’s the right length. Linking the handoff notes so support has the same wording.',
    attachment: {
      name: 'Customer handoff.md',
      detail: 'Notes · owners, timing, support contacts',
    },
  },
  {
    id: 'launch-12',
    name: 'Marcus Reed',
    initials: 'MR',
    tone: 'lavender',
    time: '9:42 AM',
    body: 'All set on my side. Next check-in here at 09:15 Monday.',
    reactions: 4,
  },
];
const seedReplies: Record<
  string,
  { name: string; text: string; time: string }[]
> = {
  m1: [
    {
      name: 'Marcus Reed',
      text: 'Thanks. Keeping rollout notes in this room too.',
      time: '9:20 AM',
    },
    {
      name: 'Olivia Chen',
      text: 'Great — one place for the final decisions.',
      time: '9:21 AM',
    },
  ],
  m3: [
    {
      name: 'Olivia Chen',
      text: '10:30 works for CS. I’ll update the calendar.',
      time: '9:25 AM',
    },
  ],
  m4: [
    {
      name: 'You',
      text: 'Use “account team” instead of a general inbox. Otherwise looks good.',
      time: '9:39 AM',
    },
  ],
};
const initialRooms: Record<string, Message[]> = {
  'launch-room': seed,
  engineering: [
    seed[5],
    seed[6],
    {
      ...seed[3],
      id: 'eng-3',
      body: 'Can we add that flag to the release checklist before Monday?',
    },
  ],
  'customer-success': [
    seed[7],
    seed[10],
    {
      ...seed[0],
      id: 'cs-3',
      body: 'I’ll send the final customer list after the account review.',
    },
  ],
  'Olivia Chen': [
    {
      ...seed[0],
      id: 'dm-olivia',
      body: 'Hey — can you give the customer note a quick read when you have a minute?',
    },
  ],
  'Marcus Reed': [
    {
      ...seed[2],
      id: 'dm-marcus',
      body: 'I’m covering the rollout Monday. Send any last-minute checks my way.',
    },
  ],
};
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
  const [, setMentionedIds] = useState<string[]>([]);
  const requests = useRef(new Map<string, {controller: AbortController; agent: AgentMember; room: string; history: {role: string;content: string}[]}>());
  const retries = useRef(new Map<string, {agent: AgentMember; room: string; history: {role: string;content: string}[]}>());
  const [memberProfile, setMemberProfile] = useState<WorkspaceMember | null>(null);
  useEffect(() => () => { requests.current.forEach(request => request.controller.abort()); }, []);
  const [view, setView] = useState<View>('chat');
  const [channel, setChannel] = useState('launch-room');
  const [channels, setChannels] = useState([
    'launch-room',
    'engineering',
    'customer-success',
  ]);
  const [messagesByRoom, setMessagesByRoom] =
    useState<Record<string, Message[]>>(initialRooms);
  const messages = messagesByRoom[channel] || [];
  const [draft, setDraft] = useState('');
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
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approval, setApproval] = useState('Needs review');
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
            channels?: string[];
            rooms?: Record<string, Message[]>;
            replies?: Record<string, string[]>;
            reactions?: Record<string, number>;
            approval?: string;
            preferences?: boolean[];
            canvas?: string;
          };
          if (data.rooms) Object.values(data.rooms).forEach(room=>room.forEach(message=>{if(message.requestState==='pending'){message.requestState='error';message.error='Response interrupted by reload. Retry to continue.'}}));
          if (Array.isArray(data.channels))
            setChannels(
              data.channels.filter((name) => typeof name === 'string'),
            );
          if (data.rooms && typeof data.rooms === 'object')
            setMessagesByRoom(
              Object.fromEntries(
                Object.entries({ ...initialRooms, ...data.rooms }).map(
                  ([room, saved]) => [
                    room,
                    initialRooms[room]
                      ? [
                          ...initialRooms[room],
                          ...saved.filter(
                            (message) =>
                              !initialRooms[room].some(
                                (fixture) => fixture.id === message.id,
                              ) &&
                              !seed.some(
                                (fixture) => fixture.id === message.id,
                              ),
                          ),
                        ]
                      : saved,
                  ],
                ),
              ),
            );
          if (data.replies) setReplies(data.replies);
          if (data.reactions) setReactionCounts(data.reactions);
          if (data.approval) setApproval(data.approval);
          if (data.preferences?.length === 3) setPreferences(data.preferences);
          if (typeof data.canvas === 'string') setCanvas(data.canvas);
        }
      } catch {
        /* Start from sample data if storage is unavailable. */
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      const rooms = Object.fromEntries(
        Object.entries(messagesByRoom).map(([name, messages]) => [
          name,
          messages.map((message) => ({
            ...message,
            body: plainText(message.body),
          })),
        ]),
      );
      localStorage.setItem(
        'relay-workspace-v1',
        JSON.stringify({
          channels,
          rooms,
          replies,
          reactions: reactionCounts,
          approval,
          preferences,
          canvas,
        }),
      );
    } catch {
      /* Session state remains usable if browser storage is full. */
    }
  }, [
    hydrated,
    channels,
    messagesByRoom,
    replies,
    reactionCounts,
    approval,
    preferences,
    canvas,
  ]);
  const currentRef = useRef({ channel, view });
  useEffect(() => {
    currentRef.current = { channel, view };
  }, [channel, view]);
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
            description: 'Navigate the local Relay demo workspace.',
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
              return result({ view: next, localOnly: true });
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_workspace',
            description:
              'Read a non-sensitive summary of the local Relay demo workspace.',
            inputSchema: { type: 'object', properties: {} },
            execute: async (
              _input: unknown,
              options?: { signal?: AbortSignal },
            ) => {
              if (options?.signal?.aborted) throw new Error('Aborted');
              return result({
                workspace: 'Meridian',
                ...currentRef.current,
                localOnly: true,
                serversConnected: false,
              });
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
        `${message.name} ${plainText(message.body)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : messages;
  function openRoom(name: string) {
    const member = members.find(person => person.id === name || person.name === name);
    const room = member ? `dm:${member.id}` : name;
    setChannel(room);
    setDm(member?.id ?? null);
    if (member) setMessagesByRoom(all => ({...all, [room]: all[room] ?? all[member.name] ?? []}));
    setDraft('');
    setMentionedIds([]);
    setTab('messages');
    setView('chat');
  }
  function updateRequest(room: string, id: string, patch: Partial<Message>) {
    setMessagesByRoom(all => ({...all,[room]:(all[room] ?? []).map(message=>message.id===id?{...message,...patch}:message)}));
  }
  async function requestAgent(agent: AgentMember, room: string, history: {role:string;content:string}[], existingId?:string) {
    if ([...requests.current.values()].some(request=>request.agent.id===agent.id)) {
      notify(`${agent.name} is already responding. Wait or stop the current response.`);
      return;
    }
    const id=existingId ?? `agent-${crypto.randomUUID()}`;
    const controller=new AbortController();
    const request={controller,agent,room,history};
    requests.current.set(id,request);retries.current.set(id,{agent,room,history});
    const reply:Message={id,name:agent.name,initials:agent.initials,tone:agent.tone??'mint',time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),body:'',agent:agent.runtime,memberId:agent.id,requestState:'pending'};
    if(existingId)updateRequest(room,id,{body:'',requestState:'pending',error:undefined});
    else setMessagesByRoom(all=>({...all,[room]:[...(all[room]??[]),reply]}));
    setAgentActivity(agent.name,'working');
    const timeout=setTimeout(()=>controller.abort(),120000);
    let content='';
    try {
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({messages:history,agentId:agent.id,agent:{id:agent.id,name:agent.name,instructions:agent.instructions,runtime:agent.runtime,model:agent.model,homeId:agent.homeId}})});
      if(!response.ok){const error:unknown=await response.json().catch(()=>null);const detail=error&&typeof error==='object'&&'error' in error&&typeof error.error==='string'?error.error:`Request failed (${response.status}).`;throw new Error(detail)}
      if(!response.body)throw new Error('The server returned no response stream.');
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
      function consume(frame:string){
        for(const line of frame.split('\n')){if(!line.startsWith('data:'))continue;const payload=line.slice(5).trim();if(!payload||payload==='[DONE]')continue;
          const data=JSON.parse(payload);if(data.error)throw new Error(typeof data.error==='string'?data.error:data.error.message??'Agent request failed.');
          const delta=data.choices?.[0]?.delta?.content;if(typeof delta==='string'){content+=delta;updateRequest(room,id,{body:content})}
        }
      }
      while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');let split;while((split=buffer.indexOf('\n\n'))>=0){consume(buffer.slice(0,split));buffer=buffer.slice(split+2)}}
      buffer+=decoder.decode();if(buffer.trim())consume(buffer);
      if(!content.trim())throw new Error('The agent returned an empty response. Try again.');
      updateRequest(room,id,{requestState:'complete',error:undefined});retries.current.delete(id);setAgentActivity(agent.name,'ready');
    }catch(error){
      const message=controller.signal.aborted?'Response stopped. You can retry.':error instanceof Error?error.message:'Unable to reach the agent. Try again.';
      updateRequest(room,id,{requestState:'error',error:message});setAgentActivity(agent.name,'blocked');
    }finally{clearTimeout(timeout);requests.current.delete(id)}
  }
  function retryMessage(message:Message){
    const retry=retries.current.get(message.id);
    const agent=members.find((member):member is AgentMember=>member.kind==='agent'&&member.id===message.memberId);
    const history=(messagesByRoom[channel]??[]).slice(0,(messagesByRoom[channel]??[]).findIndex(item=>item.id===message.id)).filter(item=>!item.requestState||item.requestState==='complete').map(item=>({role:item.memberId===agent?.id?'assistant':'user',content:`${item.name}: ${plainText(item.body)}`})).slice(-40);
    if(retry)void requestAgent(agent??retry.agent,retry.room,retry.history,message.id);
    else if(agent)void requestAgent(agent,channel,history,message.id);
  }
  function send() {
    const text = draft.trim();
    if (!text) return;
    const message:Message = {id:`local-${crypto.randomUUID()}`,name:'You',initials:'YO',tone:'you-avatar',time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),body:text,memberId:'you'};
    const history=[...(messagesByRoom[channel]??[]),message].filter(item=>!item.requestState||item.requestState==='complete');
    setMessagesByRoom(all=>({...all,[channel]:[...(all[channel]??[]),message]}));
    setDraft('');setMentionedIds([]);
    const hasMention=(name:string)=>{const at=text.toLowerCase().indexOf(`@${name.toLowerCase()}`);return at>=0&&(at===0||/\s/.test(text[at-1]))&&(!text[at+name.length+1]||/[\s.,!?;:]/.test(text[at+name.length+1]));};
    const requested=members.filter((member):member is AgentMember=>member.kind==='agent'&&(dm===member.id||hasMention(member.name)));
    requested.forEach(agent=>void requestAgent(agent,channel,history.slice(-40).map(item=>({role:item.memberId===agent.id?'assistant':'user',content:`${item.name}: ${plainText(item.body)}`}))));
  }
  function addChannel(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = channelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    setChannels((items) => (items.includes(name) ? items : [...items, name]));
    setMessagesByRoom((all) => ({ ...all, [name]: all[name] || [] }));
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
            Relay<span className="brand-period">.</span>
            <span className="brand-version">PREVIEW</span>
          </div>
          <button
            className="workspace-switch"
            onClick={() => setProfileOpen(true)}
          >
            <span className="workspace-avatar">M</span>
            <span>
              <strong>Meridian</strong>
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
                  {name === 'launch-room' && <span className="rail-dot" />}
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
            <span>Meridian</span>
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
            members={members}
            onMention={id=>setMentionedIds(ids=>ids.includes(id)?ids:[...ids,id])}
            retry={retryMessage}
            stop={id=>requests.current.get(id)?.controller.abort()}
            openMember={member=>setMemberProfile(member)}
            dm={!!dm}
            approval={approval}
            reviewDraft={() => setApprovalOpen(true)}
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
          reviewDraft={() => setApprovalOpen(true)}
          openRoom={openRoom}
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
                <div className="message-text">{thread.body}</div>
              </div>
              <div className="thread-replies">
                {(seedReplies[thread.id] || []).map((reply, index) => (
                  <div className="thread-reply" key={`seed-${index}`}>
                    <strong>{reply.name}</strong>
                    <time className="muted small"> {reply.time}</time>
                    <p>{reply.text}</p>
                  </div>
                ))}
                {(replies[thread.id] || []).map((reply, index) => (
                  <div className="thread-reply" key={index}>
                    <strong>You</strong>
                    <p>{reply}</p>
                  </div>
                ))}
                {!replies[thread.id]?.length &&
                  !seedReplies[thread.id]?.length && (
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
            <DialogTitle>Search Relay</DialogTitle>
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
                    {m.name}:{' '}
                    {typeof m.body === 'string' ? m.body : 'Launch room update'}
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
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer update draft</DialogTitle>
            <DialogDescription>
              Nova · local review, no message sent
            </DialogDescription>
          </DialogHeader>
          <p>
            Your new workspace opens Monday at 10:30. Start with the launch
            guide, and reply to your account team if you need a hand.
          </p>
          <span className="badge">{approval}</span>
          <DialogFooter>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setApproval('Rejected');
                setApprovalOpen(false);
              }}
            >
              Reject draft
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setApproval('Approved');
                setApprovalOpen(false);
              }}
            >
              Approve draft
            </button>
          </DialogFooter>
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
            <p className="muted">Meridian workspace</p>
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
  members, onMention, retry, stop, openMember,
  dm,
  approval,
  reviewDraft,
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
  stop:(id:string)=>void;
  openMember:(member:WorkspaceMember)=>void;
  dm: boolean;
  approval: string;
  reviewDraft: () => void;
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
              <div className="date-divider">Today</div>
              {messages.map((m, index) => (
                <article
                  className={`message-row ${messages[index - 1]?.name === m.name ? 'message-grouped' : ''}`}
                  key={m.id}
                >
                  {m.agent ? <AgentAvatar character={m.name === 'Nova' ? 'ladybug' : 'worm'} state="idle" size={32} label={m.name} className="message-agent-avatar" /> : <span className={`avatar ${m.tone}`}>{m.initials}</span>}
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
                    <div className="message-text">
                      {typeof m.body === 'string'
                        ? messageText(m.body)
                        : m.body}
                    </div>
                    {m.requestState==='pending'&&<output className="message-request-state">Responding… <button onClick={()=>stop(m.id)}>Stop</button></output>}
                    {m.requestState==='error'&&<div className="message-request-state message-request-error" role="alert">{m.error}<button onClick={()=>retry(m)}>Retry</button></div>}
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
                    {m.id === 'm4' && (
                      <div className="approval-preview">
                        <button
                          className="btn btn-secondary"
                          onClick={reviewDraft}
                        >
                          <FileText size={14} /> Review draft
                        </button>
                        <span className="badge">{approval}</span>
                      </div>
                    )}
                    <div className="message-reactions">
                      {(m.reactions || 0) + (reactionCounts[m.id] || 0) > 0 && (
                        <button
                          className="reaction"
                          onClick={() => react(m.id)}
                        >
                          <ThumbsUp size={12} />{' '}
                          {(m.reactions || 0) + (reactionCounts[m.id] || 0)}
                        </button>
                      )}
                      {(replies[m.id]?.length || 0) +
                        (seedReplies[m.id]?.length || 0) >
                        0 && (
                        <button
                          className="reply-action"
                          onClick={() => setThread(m)}
                        >
                          <MessageCircle size={13} />
                          {(replies[m.id]?.length || 0) +
                            (seedReplies[m.id]?.length || 0)}{' '}
                          {(replies[m.id]?.length || 0) +
                            (seedReplies[m.id]?.length || 0) ===
                          1
                            ? 'reply'
                            : 'replies'}
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
                <button
                  className="context-agent"
                  onClick={() => navigate('agents')}
                >
                  <AgentAvatar character="worm" state="idle" size={32} label="Atlas"/>
                  <span>
                    <strong>
                      Atlas <span className="tiny-route local">LOCAL</span>
                    </strong>
                    <small>Engineering partner · GB10</small>
                  </span>
                  <span className="status-dot green" />
                </button>
                <button
                  className="context-agent"
                  onClick={() => navigate('agents')}
                >
                  <AgentAvatar character="ladybug" state="idle" size={32} label="Nova"/>
                  <span>
                    <strong>
                      Nova <span className="tiny-route cloud">CLOUD</span>
                    </strong>
                    <small>Creative partner · draft mode</small>
                  </span>
                  <span className="status-dot blue" />
                </button>
                <button
                  className="add-agent-link"
                  onClick={() => navigate('agents')}
                >
                  <Plus size={14} /> Invite an agent
                </button>
              </div>
              <div className="context-section">
                <div className="context-label">
                  <span>SHARED FILES</span>
                  <button onClick={() => setTab('files')}>See all</button>
                </div>
                {[
                  'Launch checklist.pdf',
                  'Customer handoff.md',
                  'Decision log',
                ].map((f, i) => (
                  <button
                    className="context-document"
                    key={f}
                    onClick={() => setTab('files')}
                  >
                    <span
                      className={`document-icon ${i === 1 ? 'green' : i === 2 ? 'amber' : ''}`}
                    >
                      <FileText size={15} />
                    </span>
                    <span>
                      <strong>{f}</strong>
                      <small>
                        <Users size={10} />{' '}
                        {i === 0 ? 'Olivia Chen' : 'Launch room'}
                      </small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
              <div className="launch-card">
                <div>
                  <span className="badge badge-blue">PROJECT</span>
                  <MoreHorizontal size={15} />
                </div>
                <h3>Meridian launch</h3>
                <p>
                  Keep the handoff visible and review the final customer note.
                </p>
                <div className="progress-track">
                  <span className="progress-fill" style={{ width: '72%' }} />
                </div>
                <div className="launch-progress">
                  <span>6 of 8 tasks</span>
                  <strong>72%</strong>
                </div>
                <button className="btn" onClick={() => navigate('projects')}>
                  Open project <ChevronRight size={13} />
                </button>
              </div>
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
            {[
              'Launch checklist.pdf',
              'Customer handoff.md',
              'Decision log',
            ].map((f) => (
              <button
                className="list-row"
                key={f}
                onClick={() => navigate('data')}
              >
                <FileText size={17} />
                <span>
                  <strong>{f}</strong>
                  <small className="muted">
                    Workspace files
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
  reviewDraft,
  openRoom,
  view,
  navigate,
  notify,
}: {
  preferences: boolean[];
  setPreferences: (value: boolean[]) => void;
  reviewDraft: () => void;
  openRoom: (name: string) => void;
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
        <InboxView reviewDraft={reviewDraft} openRoom={openRoom} />
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
        <WorkflowsView onNotify={notify} />
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
function InboxView({
  reviewDraft,
  openRoom,
}: {
  reviewDraft: () => void;
  openRoom: (name: string) => void;
}) {
  return (
    <div className="view-content">
      <div className="page">
        <div className="page-heading">
          <div className="eyebrow">YOUR ATTENTION</div>
          <h1>Inbox</h1>
          <p className="subtitle">
            Review the moments that need a person before work moves forward.
          </p>
        </div>
        <button className="inbox-item" onClick={reviewDraft}>
          <span className="inbox-item-icon amber">
            <ShieldCheck size={19} />
          </span>
          <span>
            <strong>Nova prepared a customer update draft</strong>
            <small>#launch-room · Cloud draft · 8 minutes ago</small>
          </span>
          <span className="badge badge-amber">Needs review</span>
          <ChevronRight size={17} />
        </button>
        <button className="inbox-item" onClick={() => openRoom('engineering')}>
          <span className="inbox-item-icon">
            <AtSign size={19} />
          </span>
          <span>
            <strong>Marcus Reed mentioned you in #engineering</strong>
            <small>“Can you confirm the rollout owner?” · 18 minutes ago</small>
          </span>
          <span className="badge badge-blue">Mention</span>
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
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
