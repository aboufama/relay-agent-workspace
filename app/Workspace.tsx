'use client';
import { AgentAvatar, setAgentActivity, setAgentAvailability } from '@/components/AgentAvatar';
import { SettingsView } from './components/SettingsView';
import { InboxView } from './components/InboxView';
import { useWorkspaceName } from '@/lib/workspace-name';
import { HuddlesView } from './components/HuddlesView';
import { useWorkspaceMembers, type WorkspaceMember, type AgentMember } from '@/lib/workspace-members';
import { LiveComposer, type ComposerHandle } from './LiveComposer';
import './live-chat.css';
import { MemberAvatar } from '@/components/MemberAvatar';
import { useAgentHomes } from '@/lib/agent-homes';
import './chat-quality.css';
import { ChatHeader } from '@/components/buzz/ChatHeader';

import { isValidElement, useEffect, useRef, useState } from 'react';
import type { ReactNode, SyntheticEvent, CSSProperties } from 'react';
import {
  Archive,
  AtSign,
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
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
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
import { ComputeView } from './components/ComputeView';
import { DeepDiveView } from './components/DeepDiveView';

type View =
  | 'chat'
  | 'inbox'
  | 'agents'
  | 'data'
  | 'compute'
  | 'deep-dive'
  | 'huddles'
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
function resolveMember(members: readonly WorkspaceMember[], id?: string, name?: string) { return id ? members.find(member => member.id === id) : members.find(member => member.name === name); }
function hasAgentMention(text: string, name: string): boolean {
  const token = `@${name.toLocaleLowerCase()}`;
  const input = text.toLocaleLowerCase();
  let offset = input.indexOf(token);
  while (offset >= 0) {
    if ((offset === 0 || /\s/.test(input[offset - 1])) && (!input[offset + token.length] || /[\s.,!?;:]/.test(input[offset + token.length]))) return true;
    offset = input.indexOf(token, offset + token.length);
  }
  return false;
}
const seed: Message[] = [
  {
    id: 'm1',
    memberId: 'olivia',
    name: 'Olivia Chen',
    initials: 'OC',
    tone: 'peach',
    time: '9:18 AM',
    body: 'Morning. Moving the Monday launch handoff here so engineering and CS have the same plan.',
    reactions: 3,
  },
  {
    id: 'launch-2',
    memberId: 'olivia',
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
    memberId: 'marcus',
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
    memberId: 'you',
    name: 'You',
    initials: 'YO',
    tone: 'you-avatar',
    time: '9:24 AM',
    body: 'Works for me. Let’s make the rollback owner explicit too.',
  },
  {
    id: 'm2',
    memberId: 'atlas',
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
    memberId: 'marcus',
    name: 'Marcus Reed',
    initials: 'MR',
    tone: 'lavender',
    time: '9:28 AM',
    body: 'Put me down for rollback. Adding the feature flag command to the runbook:',
  },
  {
    id: 'launch-7',
    memberId: 'marcus',
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
    memberId: 'olivia',
    name: 'Olivia Chen',
    initials: 'OC',
    tone: 'peach',
    time: '9:32 AM',
    body: 'Perfect. CS can cover 10:30. I’ll keep the note focused on what customers can actually do on day one.',
    reactions: 3,
  },
  {
    id: 'launch-9',
    memberId: 'you',
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
    memberId: 'nova',
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
    memberId: 'olivia',
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
    memberId: 'marcus',
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
  { memberId?: string; name: string; text: string; time: string }[]
> = {
  m1: [
    {
      memberId: 'marcus',
    name: 'Marcus Reed',
      text: 'Thanks. Keeping rollout notes in this room too.',
      time: '9:20 AM',
    },
    {
      memberId: 'olivia',
    name: 'Olivia Chen',
      text: 'Great — one place for the final decisions.',
      time: '9:21 AM',
    },
  ],
  m3: [
    {
      memberId: 'olivia',
    name: 'Olivia Chen',
      text: '10:30 works for CS. I’ll update the calendar.',
      time: '9:25 AM',
    },
  ],
  m4: [
    {
      memberId: 'you',
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
  const workspaceName = useWorkspaceName();
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
  const homes = useAgentHomes();
  useEffect(() => { members.forEach(member => { if (member.kind === 'agent') setAgentAvailability(member.id, homes.some(home => home.id === member.homeId && home.status === 'connected'), member.paused === true, member.character); }); }, [homes, members]);
  const [threadSnapshot, setThread] = useState<Message | null>(null);
  const thread = threadSnapshot ? Object.values(messagesByRoom).flat().find(message => message.id === threadSnapshot.id) ?? threadSnapshot : null;
  const [starred, setStarred] = useState(false);
  const [tab, setTab] = useState('messages');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newChannel, setNewChannel] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [canvases, setCanvases] = useState<Record<string, string>>({ 'launch-room': '# Launch room\n\nDecision log\n- Confirm handoff window\n- Review customer draft\n- Keep launch checklist current' });
  const canvas = canvases[channel] ?? '';
  const setCanvas = (value: string) => setCanvases(all => ({ ...all, [channel]: value }));
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
            canvases?: Record<string, string>;
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
          if (data.canvases && typeof data.canvases === 'object') setCanvases(Object.fromEntries(Object.entries(data.canvases).filter(([,value]) => typeof value === 'string')));
          else if (typeof data.canvas === 'string') setCanvases({ 'launch-room': data.canvas });
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
          canvases,
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
    canvases,
  ]);
  const currentRef = useRef({ channel, view });
  useEffect(() => {
    currentRef.current = { channel, view };
  }, [channel, view]);
  const [dm, setDm] = useState<string | null>(null);
  const [threadReply, setThreadReply] = useState('');
  const threadComposerRef = useRef<ComposerHandle>(null);
  const [panelWidth, setPanelWidth] = useState(390);
  const panelRef = useRef<HTMLElement>(null);
  const threadMessages = thread ? messagesByRoom[`thread:${thread.id}`] ?? [] : [];
  const openThread = (message: Message) => { setMemberProfile(null); setThread(message); setThreadReply(''); };
  const openProfile = (member: WorkspaceMember) => { setThread(null); setMemberProfile(member); };
  useEffect(() => {
    if (!threadSnapshot && !memberProfile) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { setThread(null); setMemberProfile(null); previous?.focus(); } };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [threadSnapshot, memberProfile]);
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
      'deep-dive',
      'huddles',
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
            description: 'Navigate the Relay workspace.',
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
              setView((next === 'agents' ? 'compute' : next) as View);
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
    setView((next === 'agents' ? 'compute' : next) as View);
  };
  const results = Object.entries(messagesByRoom).filter(([room]) => !room.startsWith('thread:')).flatMap(([room, items]) => items.map(message => ({...message, room}))).filter(message => !search.trim() || `${message.name} ${plainText(message.body)}`.toLowerCase().includes(search.toLowerCase())).slice(-100).reverse();
  function openRoom(name: string) {
    const member = members.find(person => person.id === name || person.name === name);
    const room = member ? `dm:${member.id}` : name;
    setThread(null);
    setMemberProfile(null);
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
    if (agent.paused) { notify(`${agent.name} is paused.`); return; }
    const id=existingId ?? `agent-${crypto.randomUUID()}`;
    const controller=new AbortController();
    const request={controller,agent,room,history};
    requests.current.set(id,request);retries.current.set(id,{agent,room,history});
    const reply:Message={id,name:agent.name,initials:agent.initials,tone:agent.tone??'mint',time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),body:'',agent:agent.runtime,memberId:agent.id,requestState:'pending'};
    if(existingId)updateRequest(room,id,{body:'',requestState:'pending',error:undefined});
    else setMessagesByRoom(all=>({...all,[room]:[...(all[room]??[]),reply]}));
    setAgentActivity(agent.id,'working');
    const timeout=setTimeout(()=>controller.abort('timeout'),120000);
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
      updateRequest(room,id,{requestState:'complete',error:undefined});retries.current.delete(id);setAgentActivity(agent.id,'ready');
    }catch(error){
      const message=controller.signal.aborted?'Response stopped. You can retry.':error instanceof Error?error.message:'Unable to reach the agent. Try again.';
      updateRequest(room,id,{requestState:'error',error:message});setAgentActivity(agent.id,controller.signal.aborted && controller.signal.reason !== 'timeout' ? 'ready' : 'blocked');
    }finally{clearTimeout(timeout);requests.current.delete(id)}
  }
  function retryMessage(message:Message, room = channel){
    const retry=retries.current.get(message.id);
    const agent=members.find((member):member is AgentMember=>member.kind==='agent'&&member.id===message.memberId);
    const parent = room.startsWith('thread:') ? Object.values(messagesByRoom).flat().find(item => item.id === room.slice(7)) : undefined;
    const before = (messagesByRoom[room]??[]).slice(0,(messagesByRoom[room]??[]).findIndex(item=>item.id===message.id));
    const history = [...(parent ? [parent] : []), ...before].filter(item=>!item.requestState||item.requestState==='complete').map(item=>({role:item.memberId===agent?.id?'assistant':'user',content:`${item.name}: ${plainText(item.body)}`})).slice(-40);

    if(retry)void requestAgent(agent??retry.agent,retry.room,retry.history,message.id);
    else if(agent)void requestAgent(agent,room,history,message.id);
  }
  function send() {
    const text = draft.trim();
    if (!text) return;
    const message:Message = {id:`local-${crypto.randomUUID()}`,name:'You',initials:'YO',tone:'you-avatar',time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),body:text,memberId:'you'};
    const history=[...(messagesByRoom[channel]??[]),message].filter(item=>!item.requestState||item.requestState==='complete');
    setMessagesByRoom(all=>({...all,[channel]:[...(all[channel]??[]),message]}));
    setDraft('');setMentionedIds([]);

    const requested=members.filter((member):member is AgentMember=>member.kind==='agent'&&(dm===member.id||hasAgentMention(text, member.name)));
    requested.forEach(agent=>void requestAgent(agent,channel,history.slice(-40).map(item=>({role:item.memberId===agent.id?'assistant':'user',content:`${item.name}: ${plainText(item.body)}`}))));
  }
  function sendThread() {
    const text = threadReply.trim();
    if (!text || !thread) return;
    const room = `thread:${thread.id}`;
    const message: Message = {id:`local-${crypto.randomUUID()}`,name:'You',initials:'YO',tone:'you-avatar',time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),body:text,memberId:'you'};
    const history = [thread, ...(messagesByRoom[room] ?? []), message].filter(item=>!item.requestState||item.requestState==='complete');
    setMessagesByRoom(all => ({...all, [room]: [...(all[room] ?? []), message]}));
    setThreadReply('');
    const requested = members.filter((member): member is AgentMember => member.kind === 'agent' && (dm === member.id || thread.memberId === member.id || hasAgentMention(text, member.name)));
    requested.forEach(agent => void requestAgent(agent, room, history.slice(-40).map(item=>({role:item.memberId===agent.id?'assistant':'user',content:`${item.name}: ${plainText(item.body)}`}))));
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
              <strong>{workspaceName}</strong>
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
            {nav(<Inbox size={17} />, 'Inbox', 'inbox')}
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
            {nav(<Search size={16} />, 'Deep Dive', 'deep-dive')}
            {nav(<Users size={16} />, 'Huddles', 'huddles')}
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
                  data-active={view === 'chat' && dm === p.id}
                  onClick={() => openRoom(p.id)}
                >
                  <MemberAvatar member={p} size={24} />
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
                <span className="status-dot" /> {homes.find(home => home.id === 'lab')?.status === 'connected' ? 'Connected' : 'Setting up'}
              </small>
            </span>
          </button>
          <div className="rail-profile">
            <button onClick={() => setProfileOpen(true)}>
              <MemberAvatar member={members.find(m=>m.id==='you')} size={24}/>
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
      <main className={`workspace-main ${view === 'chat' && (thread || memberProfile) ? 'workspace-has-panel' : ''}`} style={{'--detail-pane-width': `${panelWidth}px`} as CSSProperties}>
        <header
          className="topbar"
          style={{ display: view === 'chat' ? 'none' : undefined }}
        >
          <div className="breadcrumbs">
            <SidebarTrigger className="mobile-menu" />
            <strong>
              {view === 'chat'
                ? `${dm ? '@' : '#'} ${channel}`
                : view === 'deep-dive' ? 'Deep Dive' : view[0].toUpperCase() + view.slice(1)}
            </strong>
            <span>/</span>
            <span>{workspaceName}</span>
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
              <MemberAvatar member={members.find(m=>m.id==='you')} size={26}/>
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
            openMember={openProfile}
            dm={!!dm}
            recipient={members.find(member=>member.id===dm)}
            approval={approval}
            reviewDraft={() => setApprovalOpen(true)}
            invite={() => setPeopleOpen(true)}
            reactionCounts={reactionCounts}
            react={(id) =>
              setReactionCounts((all) => ({ ...all, [id]: (all[id] || 0) + 1 }))
            }
            replies={Object.fromEntries(messages.map(message => [message.id, [...(replies[message.id] ?? []), ...(messagesByRoom[`thread:${message.id}`] ?? []).map(reply => plainText(reply.body))]]))}
            tab={tab}
            setTab={setTab}
            messages={messages}
            draft={draft}
            setDraft={setDraft}
            send={send}
            starred={starred}
            setStarred={setStarred}
            setThread={openThread}
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
        {view === 'chat' && (thread || memberProfile) && <aside ref={panelRef} tabIndex={-1} className="conversation-detail-pane" aria-label={thread ? 'Thread' : 'Member profile'}>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A focusable adjustable separator implements the ARIA window splitter pattern. */}
          <div className="detail-pane-resizer" role="separator" aria-orientation="vertical" aria-label="Resize details" tabIndex={0} aria-valuemin={320} aria-valuemax={560} aria-valuenow={panelWidth} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setPanelWidth(width => Math.max(320, Math.min(560, width + (event.key === 'ArrowLeft' ? 20 : -20)))); } }} onPointerDown={event => {
            event.preventDefault(); const handle = event.currentTarget; handle.setPointerCapture(event.pointerId); const start=event.clientX, width=panelWidth;
            const move = (e: PointerEvent) => setPanelWidth(Math.max(320, Math.min(560, width+start-e.clientX)));
            const end = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end); };
            handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
          }} />
          <header className="detail-pane-header"><h2>{thread ? 'Thread' : 'Profile'}</h2><button className="icon-btn" aria-label="Close details" onClick={() => {setThread(null);setMemberProfile(null)}}><X size={18}/></button></header>
          {thread ? <>
            <div className="detail-pane-scroll">
              <div className="thread-message"><MemberAvatar member={resolveMember(members,thread.memberId,thread.name)} name={thread.name} initials={thread.initials} size={36}/><div><div className="message-meta"><strong>{resolveMember(members,thread.memberId,thread.name)?.name ?? thread.name}</strong><time>{thread.time}</time></div><div className="message-text">{typeof thread.body === 'string' ? messageText(thread.body) : thread.body}</div></div></div>
              <div className="thread-reply-divider">{(seedReplies[thread.id]?.length ?? 0)+(replies[thread.id]?.length ?? 0)+threadMessages.length} replies</div>
              {(seedReplies[thread.id] ?? []).map((reply,index) => <div className="thread-message" key={`seed-${index}`}><MemberAvatar member={resolveMember(members,reply.memberId,reply.name)} name={reply.name} initials={reply.name.slice(0,2)} size={36}/><div><div className="message-meta"><strong>{resolveMember(members,reply.memberId,reply.name)?.name ?? reply.name}</strong><time>{reply.time}</time></div><div className="message-text">{reply.text}</div></div></div>)}
              {(replies[thread.id] ?? []).map((reply,index) => <div className="thread-message" key={`old-${index}`}><MemberAvatar member={members.find(m=>m.id==='you')} size={36}/><div><div className="message-meta"><strong>You</strong></div><div className="message-text">{reply}</div></div></div>)}
              {threadMessages.map(reply => <div className="thread-message" key={reply.id}><MemberAvatar member={members.find(m=>m.id===reply.memberId)} name={reply.name} initials={reply.initials} size={36}/><div><div className="message-meta"><strong>{resolveMember(members,reply.memberId,reply.name)?.name ?? reply.name}</strong><time>{reply.time}</time></div><div className="message-text">{typeof reply.body === 'string' ? messageText(reply.body) : reply.body}</div>{reply.requestState==='pending'&&<output className="message-request-state">Responding… <button onClick={()=>requests.current.get(reply.id)?.controller.abort()}>Stop</button></output>}{reply.requestState==='error'&&<div className="message-request-state" role="alert">{reply.error}<button onClick={()=>retryMessage(reply,`thread:${thread.id}`)}>Retry</button></div>}</div></div>)}
            </div>
            <div className="thread-composer composer"><LiveComposer ref={threadComposerRef} value={threadReply} onChange={setThreadReply} onSend={sendThread} members={members} onMention={()=>{}} placeholder="Reply in thread…"/><div className="composer-bottom"><div><button className="icon-btn" aria-label="Mention in thread" onClick={()=>threadComposerRef.current?.insertText('@')}><AtSign size={16}/></button><button className="icon-btn" aria-label="Add emoji to reply" onClick={()=>threadComposerRef.current?.insertText(' 🙂')}><Smile size={16}/></button></div><button className="send-button" disabled={!threadReply.trim()} aria-label="Send reply" onClick={sendThread}><Send size={15}/></button></div></div>
          </> : memberProfile && <div className="member-profile-panel">
            <MemberAvatar member={memberProfile} size={104}/><h2>{memberProfile.name}</h2><span className="badge">{memberProfile.kind==='agent'?'Agent':'Member'}</span>
            <button className="btn btn-secondary" onClick={()=>openRoom(memberProfile.id)}><MessageCircle size={16}/> Message</button>
            {memberProfile.kind==='agent'&&<><dl><div><dt>Home</dt><dd>{memberProfile.runtime==='local'?'Dell GB10':'Cloud'}</dd></div><div><dt>Access</dt><dd>{memberProfile.accessLevel}</dd></div></dl>{memberProfile.instructions&&<section><h3>Instructions</h3><p>{memberProfile.instructions}</p></section>}<button className="btn btn-secondary" onClick={()=>{const agentId=memberProfile.id;setMemberProfile(null);navigate('agents');requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('relay:open-agent',{detail:{agentId}})))}}>Agent settings</button></>}
          </div>}
        </aside>}
      </main>
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
            {results.length === 0 && <p className="search-empty">No messages found.</p>}
            {results.map((m) => (
              <button
                key={`${m.room}-${m.id}`}
                onClick={() => {
                  setSearchOpen(false);
                  openRoom(m.room.startsWith('dm:') ? m.room.slice(3) : m.room);
                  openThread(m);
                }}
              >
                <MemberAvatar member={resolveMember(members,m.memberId,m.name)} name={m.name} initials={m.initials} size={24}/>
                <span>
                  <strong>
                    {m.name}:{' '}
                    {typeof m.body === 'string' ? m.body : 'Launch room update'}
                  </strong>
                  <small>
                    {m.room.startsWith('dm:') ? members.find(person=>person.id===m.room.slice(3))?.name ?? 'Direct message' : `#${m.room}`} · {m.time}
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
              <MemberAvatar member={person} size={32}/>
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
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <div className="profile-preview">
            <MemberAvatar member={members.find(m=>m.id==='you')} size={64}/>
            <DialogTitle>Your profile</DialogTitle>
            <p className="muted">{workspaceName} workspace</p>
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
  members, onMention, retry, stop, openMember, recipient,
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
  recipient?: WorkspaceMember;
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
  const composerRef = useRef<ComposerHandle>(null);
  const followingMessages = useRef(true);
  useEffect(() => { followingMessages.current = true; const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [channel, tab]);
  useEffect(() => {
    const element = scrollRef.current;
    if (element && followingMessages.current) element.scrollTop = element.scrollHeight;
  }, [messages]);
  const insertText = (text: string) => { composerRef.current?.insertText(text); };
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
        onTitleClick={recipient ? () => openMember(recipient) : undefined}
        leadingContent={
          <>
            <SidebarTrigger className="mobile-menu" />
            {recipient ? <button className="dm-header-avatar" aria-label={`View ${recipient.name}'s profile`} onClick={() => openMember(recipient)}><MemberAvatar member={recipient} size={32} /></button> : <Hash size={18} />}
          </>
        }
        titleAdornment={
          <button
            className={`icon-btn star-button ${starred ? 'starred' : ''}`}
            aria-label={dm ? 'Star conversation' : 'Star channel'}
            onClick={() => setStarred(!starred)}
          >
            <Star size={15} fill={starred ? 'currentColor' : 'none'} />
          </button>
        }
        actions={
          <div className="channel-actions">
            {!dm && <div className="member-stack">
              {members.slice(0,3).map((p) => (
                <MemberAvatar key={p.id} member={p} size={24}/>
              ))}
              <span className="member-number">{members.length}</span>
            </div>}
            {!dm && <button className="btn btn-secondary desktop-only" onClick={invite}>
              <Users size={15} /> People
            </button>}
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
            <div className="conversation-scroll" ref={scrollRef} onScroll={event => { const el=event.currentTarget; followingMessages.current=el.scrollHeight-el.scrollTop-el.clientHeight<80; }}>
              {recipient && <div className="dm-conversation-intro">
                <button aria-label={`Open ${recipient.name}'s profile`} onClick={() => openMember(recipient)}><MemberAvatar member={recipient} size={72} /></button>
                <h2>{recipient.name}</h2>
                <p>This is your conversation with {recipient.name}.</p>
              </div>}
              {messages.length > 0 && <div className="date-divider">Today</div>}
              {messages.map((m, index) => (
                <article
                  className={`message-row ${messages[index - 1]?.name === m.name ? 'message-grouped' : ''}`}
                  key={m.id}
                >
                  <button className="message-avatar-button" aria-label={`View ${m.name}'s profile`} onClick={() => { const person=resolveMember(members,m.memberId,m.name); if(person)openMember(person); }}>
                    <MemberAvatar member={resolveMember(members,m.memberId,m.name)} name={m.name} initials={m.initials} size={36} />
                  </button>
                  <div className="message-body">
                    <div className="message-meta">
                      <button className="member-name-button" onClick={()=>{const member=resolveMember(members,m.memberId,m.name);if(member)openMember(member)}}>{members.find(person=>person.id===m.memberId)?.name ?? m.name}</button>
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
                  <AgentAvatar identityKey="atlas" character="worm" size={32} label="Atlas"/>
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
                  <AgentAvatar identityKey="nova" character="ladybug" size={32} label="Nova"/>
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
                <button className="btn" onClick={() => navigate('deep-dive')}>
                  Open Deep Dive <ChevronRight size={13} />
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
          <h2>{channel} notes</h2>
          <textarea
            className="canvas-editor"
            value={canvas}
            onChange={(e) => setCanvas(e.target.value)}
            aria-label="Edit shared canvas"
          />

        </div>
      ) : (
        <div className="conversation-scroll">
          <div className="card shared-file">
            <div className="card-header">
              <h2>Files shared in {dm ? '' : '#'}{channel}</h2>
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
      <div {...hidden('data')}>
        <DataView onNotify={notify} />
      </div>
      <div {...hidden('compute')}>
        <ComputeView onNotify={notify} />
      </div>
      <div {...hidden('deep-dive')}>
        <DeepDiveView />
      </div>
      <div {...hidden('huddles')}>
        <HuddlesView />
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
export default Workspace;
