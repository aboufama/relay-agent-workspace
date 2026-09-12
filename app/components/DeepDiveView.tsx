"use client";

import "./deep-dive.css";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Check, FileText, GitBranch, Maximize, Minus, Pause, Play, Plus, Save, Trash2, Waves, X } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { PageHeader } from "@/components/buzz/PageHeader";
import { useAgentMembers, type AgentMember } from "@/lib/workspace-members";
import { DEEP_DIVE_EVENTS, isDeepDiveSnapshot, safeDeepDiveSource, type DeepDiveAgent, type DeepDiveRequest, type DeepDiveSnapshot, type DeepDiveSource } from "@/lib/deep-dive";

type Draft = { id: string; topic: string; prompt: string; updatedAt: number };
type SchoolNode = { key: string; name: string; member?: AgentMember; live?: DeepDiveAgent; children: SchoolNode[]; detached?: boolean };
type PositionedNode = { node: SchoolNode; x: number; y: number; depth: number; facing: "left" | "right" };
type Line = { from: { x: number; y: number }; to: { x: number; y: number } };

export type DeepDiveViewProps = {
  /** Optional controlled snapshot. Omit to receive shoal:deep-dive:update events. */
  run?: DeepDiveSnapshot | null;
  /** If supplied, replaces the browser request event. Resolve after handing off the request. */
  onDiveRequest?: (request: DeepDiveRequest) => void | Promise<void>;
};

const draftKey = "relay.deep-dive.requests.v1";
const composerKey = "shoal.deep-dive.composer.v1";
const statusLabels = { queued: "Queued", working: "Working", waiting: "Waiting", complete: "Complete", blocked: "Needs help", failed: "Failed", cancelled: "Cancelled" };
const runLabels = { queued: "Waiting to start", running: "Dive in progress", complete: "Dive complete", failed: "Dive stopped", cancelled: "Dive cancelled" };

/** Preserve every received node, including a child arriving before its parent. */
export function buildDeepDiveForest(members: readonly AgentMember[], agents: DeepDiveAgent[]): SchoolNode[] {
  const nodes = new Map<string, SchoolNode>();
  const runtimeKeys = new Map<string, string>();
  const claimed = new Set<string>();
  for (const member of members) {
    const live = agents.find((agent) => agent.memberId === member.id && agent.parentId === null && !claimed.has(agent.id));
    const key = `member:${member.id}`;
    nodes.set(key, { key, name: member.name, member, live, children: [] });
    if (live) { runtimeKeys.set(live.id, key); claimed.add(live.id); }
  }
  for (const live of agents) {
    if (claimed.has(live.id)) continue;
    const key = `agent:${live.id}`;
    nodes.set(key, { key, name: live.name, member: members.find((member) => member.id === live.memberId), live, children: [] });
    runtimeKeys.set(live.id, key);
  }
  const parents = new Map<string, string>();
  for (const node of nodes.values()) {
    if (!node.live) continue;
    const parent = node.live.parentId ? runtimeKeys.get(node.live.parentId) : node.live.memberId ? `member:${node.live.memberId}` : undefined;
    if (parent && parent !== node.key && nodes.has(parent)) parents.set(node.key, parent);
    else if (node.live.parentId) node.detached = true;
  }
  const roots: SchoolNode[] = [];
  for (const node of nodes.values()) {
    const parentKey = parents.get(node.key);
    const seen = new Set([node.key]);
    let ancestor = parentKey;
    let cycle = false;
    while (ancestor) {
      if (seen.has(ancestor)) { cycle = true; break; }
      seen.add(ancestor);
      ancestor = parents.get(ancestor);
    }
    if (parentKey && !cycle) nodes.get(parentKey)!.children.push(node);
    else { if (cycle) node.detached = true; roots.push(node); }
  }
  return roots;
}

function layoutForest(roots: SchoolNode[]) {
  const leaves = (node: SchoolNode): number => node.children.length ? node.children.reduce((sum, child) => sum + leaves(child), 0) : 1;
  const depth = (node: SchoolNode): number => node.children.length ? 1 + Math.max(...node.children.map(depth)) : 0;
  const left = roots.filter((_, index) => index % 2 === 0);
  const right = roots.filter((_, index) => index % 2 === 1);
  const maxDepth = Math.max(0, ...roots.map(depth));
  const rootHeight = (node: SchoolNode) => Math.max(164, leaves(node) * 110);
  const columnHeight = (items: SchoolNode[]) => items.reduce((sum, node) => sum + rootHeight(node), 0) + Math.max(0, items.length - 1) * 18;
  const width = 1100 + maxDepth * 300;
  const height = Math.max(650, columnHeight(left) + 110, columnHeight(right) + 110);
  const center = { x: width / 2, y: height / 2 };
  const positions: PositionedNode[] = [];
  const lines: Line[] = [];
  const place = (node: SchoolNode, side: -1 | 1, top: number, span: number, level: number): { x: number; y: number } => {
    const point = { x: center.x + side * (330 + level * 150), y: top + span / 2 };
    positions.push({ node, ...point, depth: level, facing: side === -1 ? "right" : "left" });
    let nextTop = top;
    for (const child of node.children) {
      const childSpan = span * leaves(child) / leaves(node);
      const childPoint = place(child, side, nextTop, childSpan, level + 1);
      lines.push({ from: point, to: childPoint });
      nextTop += childSpan;
    }
    return point;
  };
  for (const [items, side] of [[left, -1], [right, 1]] as const) {
    let top = (height - columnHeight(items)) / 2;
    for (const node of items) {
      const span = rootHeight(node);
      const root = place(node, side, top, span, 0);
      lines.push({ from: { x: center.x + side * 166, y: center.y }, to: root });
      top += span + 18;
    }
  }
  return { width, height, center, positions, lines };
}

function labelFor(node: SchoolNode) {
  return node.live ? statusLabels[node.live.status] : node.member?.paused ? "Paused" : "Awaiting a dive";
}

function FishPortrait({ node, compact = false, facing = "left" }: { node: SchoolNode; compact?: boolean; facing?: "left" | "right" }) {
  return (
    <span className={`shoal-fish ${compact ? "is-small" : ""}`} data-facing={facing}>
      <Image className="shoal-fish-vessel" src="/deep-dive/clay-fish.png" alt="" width={168} height={112} unoptimized />
      <span className="shoal-fish-passenger">
        {node.member ? <AgentAvatar identityKey={node.member.id} character={node.member.character} label={node.member.name} size={compact ? 28 : 43} /> : <span className="shoal-fish-initials" aria-hidden="true">{node.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("")}</span>}
      </span>
    </span>
  );
}

function SourceLinks({ sources }: { sources?: DeepDiveSource[] }) {
  if (!sources?.length) return null;
  return <ul className="shoal-sources">{sources.map((source, index) => {
    const url = safeDeepDiveSource(source.url);
    return url ? <li key={`${source.url}:${index}`}><a href={url} target="_blank" rel="noreferrer">{source.title || new URL(url).hostname}<ArrowUpRight size={13} /></a></li> : null;
  })}</ul>;
}

function SchoolList({ nodes, selected, onSelect, level = 0 }: { nodes: SchoolNode[]; selected: string | null; onSelect: (key: string) => void; level?: number }) {
  return <ul className="shoal-tree-list" aria-label={level === 0 ? "Agents and their subagents" : "Subagents"}>{nodes.map((node) => <li key={node.key}>
    <button type="button" className={`shoal-tree-agent ${selected === node.key ? "is-selected" : ""}`} onClick={() => onSelect(node.key)} aria-pressed={selected === node.key}>
      {node.member ? <AgentAvatar identityKey={node.member.id} character={node.member.character} label={node.name} size={36} /> : <span className="shoal-tree-fish"><FishPortrait node={node} compact /></span>}
      <span className="shoal-tree-copy"><strong>{node.name}</strong><small>{node.live?.task || node.member?.role || "Subagent"}</small></span>
      <span className="shoal-node-status" data-status={node.live?.status || "idle"}>{labelFor(node)}</span>
      {node.children.length > 0 && <span className="shoal-child-count" aria-label={`${node.children.length} direct subagents`}>{node.children.length}</span>}
    </button>
    {node.children.length > 0 && <SchoolList nodes={node.children} selected={selected} onSelect={onSelect} level={level + 1} />}
  </li>)}</ul>;
}

function Ocean({ roots, selected, onSelect, motion, children }: { roots: SchoolNode[]; selected: string | null; onSelect: (key: string) => void; motion: boolean; children: ReactNode }) {
  const layout = useMemo(() => layoutForest(roots), [roots]);
  const viewport = useRef<HTMLElement>(null);
  const [viewportSize, setViewportSize] = useState({width: 1100, height: 600});
  const compact = viewportSize.width < 600;
  const [manualScale, setManualScale] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const fitScale = Math.min(1, viewportSize.width / layout.width, viewportSize.height / layout.height);
  const scale = manualScale ?? fitScale;
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewportSize({width: entry.contentRect.width, height: entry.contentRect.height}));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className={`shoal-ocean ${motion ? "" : "is-still"}`}>
    <Image src="/deep-dive/clay-ocean.webp" alt="" fill sizes="(max-width: 800px) 100vw, 1200px" className="shoal-ocean-image" priority unoptimized />
    <div className="shoal-ocean-wash" aria-hidden="true" />
    {compact && <div className="shoal-mobile-brief">{children}</div>}
    <section className="shoal-ocean-viewport" ref={viewport} aria-label="Ocean map. Drag the water or scroll to explore. Select an agent for details."
      onPointerDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, textarea, a, label")) return;
        const element = event.currentTarget;
        drag.current = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop };
        element.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        event.currentTarget.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
        event.currentTarget.scrollTop = drag.current.top - (event.clientY - drag.current.y);
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <div className="shoal-ocean-size" style={{ width: layout.width * scale, height: layout.height * scale }}>
        <div className="shoal-ocean-world" style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}>
          <svg className="shoal-current-lines" width={layout.width} height={layout.height} aria-hidden="true">
            {layout.lines.map((line, index) => <path key={index} d={`M ${line.from.x} ${line.from.y} C ${(line.from.x + line.to.x) / 2} ${line.from.y}, ${(line.from.x + line.to.x) / 2} ${line.to.y}, ${line.to.x} ${line.to.y}`} />)}
          </svg>
          {!compact && <div className="shoal-center" style={{ left: layout.center.x, top: layout.center.y }}>{children}</div>}
          {layout.positions.map(({ node, x, y, depth, facing }, index) => <button type="button" key={node.key} className={`shoal-swimmer ${depth ? "is-subagent" : ""} ${selected === node.key ? "is-selected" : ""}`} style={{ left: x, top: y, "--swim-delay": `${-(index % 7) * 0.9}s`, "--swim-duration": `${5 + index % 4}s` } as CSSProperties} onClick={() => onSelect(node.key)} aria-pressed={selected === node.key} aria-label={`${node.name}, ${labelFor(node)}${node.live?.task ? `: ${node.live.task}` : ""}`}>
            <span className="shoal-swimmer-body"><FishPortrait node={node} compact={depth > 0} facing={facing} /></span>
            <span className="shoal-swimmer-name">{node.name}</span>
            <span className="shoal-swimmer-role" data-status={node.live?.status || "idle"}>{node.live ? labelFor(node) : node.member?.role || "Subagent"}</span>
          </button>)}
        </div>
      </div>
    </section>
    <div className="shoal-map-controls" aria-label="Ocean zoom">
      <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setManualScale(Math.max(0.3, scale - 0.15))} disabled={scale <= 0.3}><Minus size={15} /></button>
      <span aria-live="polite">{Math.round(scale * 100)}%</span>
      <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => setManualScale(Math.min(1.6, scale + 0.15))} disabled={scale >= 1.6}><Plus size={15} /></button>
      <button type="button" title="Fit ocean" aria-label="Fit ocean" onClick={() => { setManualScale(null); viewport.current?.scrollTo({ left: 0, top: 0, behavior: "instant" }); }}><Maximize size={14} /></button>
    </div>
  </div>;
}

export function DeepDiveView({ run, onDiveRequest }: DeepDiveViewProps = {}) {
  const members = useAgentMembers();
  const [brief, setBrief] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [view, setView] = useState<"ocean" | "tree">("ocean");
  const [motion, setMotion] = useState(true);
  const [received, setReceived] = useState<DeepDiveSnapshot | null>(null);
  const [request, setRequest] = useState<DeepDiveRequest | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [dispatchError, setDispatchError] = useState("");
  const currentRequest = useRef<string | null>(null);
  const dismissedRuns = useRef(new Set<string>());
  const dismissedRequests = useRef(new Set<string>());
  const briefInput = useRef<HTMLTextAreaElement>(null);
  const snapshot = run === undefined ? received : run;
  const roots = useMemo(() => buildDeepDiveForest(members, snapshot?.agents || []), [members, snapshot]);
  const allNodes = useMemo(() => {
    const result: SchoolNode[] = [];
    const queue = [...roots];
    while (queue.length) {
      const node = queue.shift()!;
      result.push(node);
      queue.unshift(...node.children);
    }
    return result;
  }, [roots]);
  const selectedNode = allNodes.find((node) => node.key === selected);
  const pending = !!request && !snapshot && !dispatchError;
  const busy = pending || snapshot?.status === "queued" || snapshot?.status === "running";
  const hasDive = !!request || !!snapshot;
  const subagentCount = snapshot?.agents.filter((agent) => agent.parentId !== null).length || 0;
  const completeCount = snapshot?.agents.filter((agent) => agent.status === "complete").length || 0;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(draftKey) || "[]");
        if (Array.isArray(stored)) setDrafts(stored.filter((item): item is Draft => !!item && typeof item === "object" && typeof item.id === "string" && typeof item.topic === "string" && typeof item.prompt === "string" && typeof item.updatedAt === "number"));
        setBrief(localStorage.getItem(composerKey)?.slice(0, 20000) || "");
      } catch { /* The editor still works when browser storage is unavailable. */ }
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(drafts));
      localStorage.setItem(composerKey, brief);
    } catch { queueMicrotask(() => setNotice("This browser cannot save drafts. Your brief is available for this session.")); }
  }, [drafts, brief, loaded]);

  useEffect(() => {
    const update = (event: Event) => {
      const value: unknown = (event as CustomEvent<unknown>).detail;
      if (!isDeepDiveSnapshot(value) || dismissedRequests.current.has(value.requestId) || dismissedRuns.current.has(value.runId) || (currentRequest.current && value.requestId !== currentRequest.current)) return;
      setReceived((previous) => previous?.runId === value.runId && previous.revision >= value.revision ? previous : value);
    };
    window.addEventListener(DEEP_DIVE_EVENTS.update, update);
    window.dispatchEvent(new CustomEvent(DEEP_DIVE_EVENTS.ready, { detail: { version: 1 } }));
    return () => window.removeEventListener(DEEP_DIVE_EVENTS.update, update);
  }, []);

  function saveDraft(value = brief, quiet = false) {
    if (!value.trim()) return;
    const item: Draft = { id: draftId || crypto.randomUUID(), topic: value.trim().split("\n")[0].slice(0, 120), prompt: value.trim(), updatedAt: Date.now() };
    setDraftId(item.id);
    setDrafts((items) => [item, ...items.filter((draft) => draft.id !== item.id)]);
    if (!quiet) setNotice("Draft saved.");
  }

  async function startDive() {
    if (!loaded || !brief.trim() || !members.length || busy) return;
    const next: DeepDiveRequest = { version: 1, requestId: crypto.randomUUID(), title: brief.trim().split("\n")[0].slice(0, 120), brief: brief.trim(), agentIds: members.map((member) => member.id), createdAt: new Date().toISOString() };
    saveDraft(brief, true);
    currentRequest.current = next.requestId;
    setRequest(next);
    setReceived(null);
    setDispatchError("");
    setNotice("");
    setSelected(null);
    try {
      if (onDiveRequest) await onDiveRequest(next);
      else window.dispatchEvent(new CustomEvent(DEEP_DIVE_EVENTS.request, { detail: next }));
    } catch {
      setDispatchError("The dive could not be handed off. Your brief is saved; try again when your agents are connected.");
    }
  }

  function newBrief() {
    if (busy) return;
    if (snapshot) dismissedRuns.current.add(snapshot.runId);
    currentRequest.current = null;
    setReceived(null); setRequest(null); setBrief(""); setDraftId(null); setSelected(null); setDispatchError(""); setNotice("");
    requestAnimationFrame(() => briefInput.current?.focus());
  }

  const composer = <form className="shoal-brief-card" onSubmit={(event) => { event.preventDefault(); void startDive(); }}>
    <h2>What should we explore?</h2>
    <label className="shoal-sr-only" htmlFor={`shoal-brief-${view}`}>Your deep dive brief</label>
    <textarea ref={briefInput} id={`shoal-brief-${view}`} value={brief} onChange={(event) => { setBrief(event.target.value); setNotice(""); }} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask a question or describe a problem…" rows={4} maxLength={20000} required />
    <div className="shoal-brief-actions">
      <button type="button" className="shoal-save" aria-label="Save brief as a draft" title="Save draft" onClick={() => saveDraft()} disabled={!loaded || !brief.trim()}><Save size={16} /><span>Save draft</span></button>
      <button type="submit" className="shoal-start" disabled={!loaded || !brief.trim() || !members.length}>Start dive<ArrowDown size={15} /></button>
    </div>
    <span className="shoal-brief-footnote">{members.length ? `All ${members.length} agents join the dive` : "Add an agent to start a dive"}<span aria-hidden="true"> · </span>⌘ / Ctrl ↵</span>
  </form>;

  const diveCard = <section className="shoal-brief-card shoal-active-brief" aria-label="Current deep dive">
    <span className="shoal-run-label" data-status={snapshot?.status || "queued"}>{snapshot?.status === "complete" ? <Check size={14} /> : <Waves size={15} />}{dispatchError ? "Could not start" : snapshot ? runLabels[snapshot.status] : "Waiting to start"}</span>
    <h2>{snapshot?.title || request?.title || "A deeper look"}</h2>
    <p>{dispatchError || snapshot?.error || (snapshot?.status === "complete" ? "Findings are ready." : snapshot?.status === "running" ? "" : snapshot?.status === "failed" ? "The dive stopped. Your brief and received work are still here." : snapshot?.status === "cancelled" ? "The dive has ended. Received work is still here." : "Waiting for live activity.")}</p>
    <details className="shoal-brief-details"><summary>Read the brief</summary><p>{snapshot?.brief || request?.brief || brief}</p></details>
    {snapshot && snapshot.agents.length > 0 && <div className="shoal-run-progress"><span>{completeCount} of {snapshot.agents.length} tasks complete</span><progress value={completeCount} max={snapshot.agents.length} aria-label="Completed tasks" /></div>}
    {dispatchError && <button type="button" className="shoal-start" onClick={() => { setRequest(null); setDispatchError(""); }}>Return to brief<ArrowUpRight size={14} /></button>}
    {!busy && !dispatchError && run === undefined && <button type="button" className="shoal-start" onClick={newBrief}>New dive<Plus size={14} /></button>}
    {pending && <button type="button" className="shoal-save" onClick={() => { if (request) dismissedRequests.current.add(request.requestId); currentRequest.current = null; setRequest(null); }}>Edit brief</button>}
  </section>;

  return <div className="page deep-dive-page shoal-deep-dive">
    <PageHeader className="page-heading shoal-page-heading" title="Deep Dive" action={<button type="button" className={`shoal-top-button ${showDrafts ? "is-selected" : ""}`} aria-expanded={showDrafts} aria-controls="shoal-drafts" onClick={() => setShowDrafts((open) => !open)}><FileText size={15} />Drafts{drafts.length > 0 && <span>{drafts.length}</span>}</button>} />
    {showDrafts && <section id="shoal-drafts" className="shoal-drafts" aria-label="Saved deep dive drafts">
      <div className="shoal-section-heading"><h2>Saved drafts</h2><button type="button" className="shoal-icon-button" aria-label="Close drafts" onClick={() => setShowDrafts(false)}><X size={16} /></button></div>
      {drafts.length ? <ul>{drafts.map((draft) => <li key={draft.id}><button type="button" className="shoal-draft-open" disabled={busy || (run !== undefined && !!run)} onClick={() => { if (snapshot) dismissedRuns.current.add(snapshot.runId); setRequest(null); setReceived(null); currentRequest.current = null; setBrief(draft.prompt); setDraftId(draft.id); setDispatchError(""); setShowDrafts(false); requestAnimationFrame(() => briefInput.current?.focus()); }}><strong>{draft.topic}</strong><span>{draft.prompt}</span><small>Draft · {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></button><button type="button" className="shoal-icon-button" aria-label={`Delete draft: ${draft.topic}`} onClick={() => { setDrafts((items) => items.filter((item) => item.id !== draft.id)); if (draftId === draft.id) setDraftId(null); setNotice("Draft deleted."); }}><Trash2 size={14} /></button></li>)}</ul> : <p className="shoal-empty-drafts">Your saved briefs will live here.</p>}
    </section>}
    <section className="shoal-experience" aria-label="Deep dive workspace">
      <div className="shoal-scene-toolbar">
        <div className="shoal-school-label"><span className="shoal-school-dot" /><strong>The shoal</strong><span>{members.length} agents{subagentCount > 0 ? ` · ${subagentCount} subagents` : ""}</span></div>
        <div className="shoal-view-switch" aria-label="View the dive"><button type="button" aria-pressed={view === "ocean"} onClick={() => setView("ocean")}><Waves size={14} />Ocean</button><button type="button" aria-pressed={view === "tree"} onClick={() => setView("tree")}><GitBranch size={14} />Tree</button></div>
      </div>
      {view === "ocean" ? <Ocean roots={roots} selected={selected} onSelect={setSelected} motion={motion}>{hasDive ? diveCard : composer}</Ocean> : <div className="shoal-tree-view"><div className="shoal-tree-brief">{hasDive ? diveCard : composer}</div><div className="shoal-tree-forest"><div className="shoal-tree-heading"><h2>The school</h2></div>{roots.length ? <SchoolList nodes={roots} selected={selected} onSelect={setSelected} /> : <p className="shoal-empty-drafts">Your agents will appear here when added to the workspace.</p>}</div></div>}
      <div className="shoal-scene-footer"><span>{snapshot ? `${snapshot.agents.length} live tasks${subagentCount ? ` · ${subagentCount} subagents` : ""}` : "Subagents appear here as they are created"}</span>{view === "ocean" && <button type="button" aria-pressed={motion} onClick={() => setMotion((value) => !value)}>{motion ? <Pause size={12} /> : <Play size={12} />}Motion {motion ? "on" : "off"}</button>}</div>
    </section>
    <section className={`shoal-agent-detail ${selectedNode ? "has-selection" : ""}`} aria-label="Selected agent details" aria-live="polite">
      {selectedNode ? <><div className="shoal-detail-heading">{selectedNode.member ? <AgentAvatar identityKey={selectedNode.member.id} character={selectedNode.member.character} label={selectedNode.name} size={40} /> : <span className="shoal-detail-fish"><FishPortrait node={selectedNode} compact /></span>}<div><h2>{selectedNode.name}</h2><span>{labelFor(selectedNode)}{selectedNode.children.length ? ` · ${selectedNode.children.length} direct subagents` : ""}</span></div><button type="button" className="shoal-icon-button" aria-label="Close agent details" onClick={() => setSelected(null)}><X size={16} /></button></div><p>{selectedNode.live?.task || selectedNode.member?.description || "This agent has joined the dive. Its task will appear when supplied."}</p>{!selectedNode.live && <small>No task assigned in this dive yet.</small>}{selectedNode.detached && <small>Parent connection is not available in the latest update.</small>}{selectedNode.live?.output && <div className="shoal-agent-output"><h3>Findings</h3><p>{selectedNode.live.output}</p><SourceLinks sources={selectedNode.live.sources} /></div>}{!selectedNode.live?.output && <SourceLinks sources={selectedNode.live?.sources} />}</> : <div className="shoal-detail-empty"><GitBranch size={19} /><div><strong>Every branch has a story.</strong><p>Select an agent to follow its task and findings.</p></div></div>}
    </section>
    {snapshot?.summary && <section className="shoal-findings" aria-label="Deep dive findings"><div className="shoal-section-heading"><h2>{snapshot.status === "complete" ? "Back from the deep" : "Findings so far"}</h2><span>{snapshot.status === "complete" ? "Dive complete" : "From the live dive"}</span></div><p>{snapshot.summary}</p><SourceLinks sources={snapshot.sources} /></section>}
    {notice && <output className="shoal-notice">{notice}</output>}
  </div>;
}
