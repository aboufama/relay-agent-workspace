"use client";

import "./deep-dive.css";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, X } from "lucide-react";
import { SelectField } from "@/components/SelectField";
import { AgentAvatar } from "@/components/AgentAvatar";
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

function layoutForest(roots: SchoolNode[], compact = false) {
  const leaves = (node: SchoolNode): number => node.children.length ? node.children.reduce((sum, child) => sum + leaves(child), 0) : 1;
  const depth = (node: SchoolNode): number => node.children.length ? 1 + Math.max(...node.children.map(depth)) : 0;
  const left = roots.filter((_, index) => index % 2 === 0);
  const right = roots.filter((_, index) => index % 2 === 1);
  const maxDepth = Math.max(0, ...roots.map(depth));
  const rootHeight = (node: SchoolNode) => Math.max(164, leaves(node) * 110);
  const columnHeight = (items: SchoolNode[]) => items.reduce((sum, node) => sum + rootHeight(node), 0) + Math.max(0, items.length - 1) * 18;
  const width = (compact ? 600 : 1100) + maxDepth * (compact ? 240 : 300);
  const height = Math.max(650, columnHeight(left) + 110, columnHeight(right) + 110);
  const center = { x: width / 2, y: height / 2 };
  const positions: PositionedNode[] = [];
  const lines: Line[] = [];
  const place = (node: SchoolNode, side: -1 | 1, top: number, span: number, level: number): { x: number; y: number } => {
    const point = { x: center.x + side * ((compact ? 150 : 330) + level * (compact ? 120 : 150)), y: top + span / 2 };
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
      place(node, side, top, span, 0);
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
        {node.member ? <AgentAvatar identityKey={node.member.id} character={node.member.character} label={node.member.name} preview={!!node.live} state={node.live?.status === "working" ? "thinking" : node.live?.status === "blocked" || node.live?.status === "failed" ? "stuck" : node.live?.status === "cancelled" || node.member.paused ? "sleep" : "idle"} size={compact ? 28 : 43} /> : <span className="shoal-fish-initials" aria-hidden="true">{node.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("")}</span>}
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

function Ocean({ roots, selected, onSelect, children }: { roots: SchoolNode[]; selected: string | null; onSelect: (key: string) => void; children: ReactNode }) {
  const viewport = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 1100, height: 650 });
  const compact = size.width < 700;
  const layout = useMemo(() => layoutForest(roots, compact), [roots, compact]);
  const scale = Math.max(0.6, Math.min(1, size.width / layout.width, size.height / layout.height));
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="shoal-ocean">
    <div className="shoal-input">{children}</div>
    <section className="shoal-ocean-viewport" ref={viewport} aria-label="Agents and their subagents">
      <div className="shoal-ocean-size" style={{ width: layout.width * scale, height: layout.height * scale }}>
        <div className="shoal-ocean-world" style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}>
          <svg className="shoal-current-lines" width={layout.width} height={layout.height} aria-hidden="true">
            {layout.lines.map((line, index) => <path key={index} d={`M ${line.from.x} ${line.from.y} C ${(line.from.x + line.to.x) / 2} ${line.from.y}, ${(line.from.x + line.to.x) / 2} ${line.to.y}, ${line.to.x} ${line.to.y}`} />)}
          </svg>
          {layout.positions.map(({ node, x, y, depth, facing }, index) => <button type="button" key={node.key} className={`shoal-swimmer ${depth ? "is-subagent" : ""} ${selected === node.key ? "is-selected" : ""}`} style={{ left: x, top: y, "--swim-delay": `${-(index % 7) * 0.9}s`, "--swim-duration": `${5 + index % 4}s` } as CSSProperties} onClick={() => onSelect(node.key)} aria-pressed={selected === node.key} aria-label={`${node.name}, ${labelFor(node)}${node.live?.task ? `: ${node.live.task}` : ""}`}>
            <span className="shoal-swimmer-body"><FishPortrait node={node} compact={depth > 0} facing={facing} /></span>
            <span className="shoal-swimmer-name">{node.name}</span>
            {node.live && <span className="shoal-swimmer-status">{labelFor(node)}</span>}
          </button>)}
        </div>
      </div>
    </section>
  </div>;
}

export function DeepDiveView({ run, onDiveRequest }: DeepDiveViewProps = {}) {
  const members = useAgentMembers();
  const [brief, setBrief] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
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

  const selectedWork = selectedNode?.live;
  const hasSelectedWork = !!(selectedWork?.task || selectedWork?.output || selectedWork?.sources?.length);

  return <div className="page deep-dive-page shoal-deep-dive">
    <h1 className="shoal-title">Deep Dive</h1>
    <Ocean roots={roots} selected={selected} onSelect={(key) => {
      const work = allNodes.find((node) => node.key === key)?.live;
      setSelected(work?.task || work?.output || work?.sources?.length ? key : null);
    }}>
      {!hasDive ? <form className="shoal-composer" onSubmit={(event) => { event.preventDefault(); void startDive(); }}>
        <label htmlFor="shoal-brief">What should we explore?</label>
        <textarea ref={briefInput} id="shoal-brief" value={brief} onChange={(event) => { setBrief(event.target.value); setNotice(""); }} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask a question or describe a problem…" rows={4} maxLength={20000} required />
        <div className="shoal-input-actions">
          {drafts.length > 0 && <SelectField className="shoal-saved-briefs" aria-label="Open a saved brief" value="" onChange={(event) => { const draft = drafts.find((item) => item.id === event.target.value); if (draft) { setBrief(draft.prompt); setDraftId(draft.id); } }}><option value="">Saved briefs</option>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.topic}</option>)}</SelectField>}
          <button type="submit" className="shoal-start" disabled={!loaded || !brief.trim() || !members.length}>Start dive<ArrowDown size={16} /></button>
        </div>
      </form> : <section className="shoal-live-brief" aria-label="Current dive">
        <output className="shoal-run-status">{dispatchError ? "Could not start" : snapshot ? runLabels[snapshot.status] : "Waiting for live activity"}</output>
        <h2>{snapshot?.title || request?.title || "Deep Dive"}</h2>
        {(dispatchError || snapshot?.error) && <p>{dispatchError || snapshot?.error}</p>}
        <details><summary>Brief</summary><p>{snapshot?.brief || request?.brief || brief}</p></details>
        {pending && <button type="button" className="shoal-text-button" onClick={() => { if (request) dismissedRequests.current.add(request.requestId); currentRequest.current = null; setRequest(null); }}>Edit brief</button>}
        {dispatchError && <button type="button" className="shoal-text-button" onClick={() => { setRequest(null); setDispatchError(""); }}>Return to brief</button>}
        {!busy && !dispatchError && run === undefined && <button type="button" className="shoal-text-button" onClick={newBrief}>New dive</button>}
      </section>}
      {hasSelectedWork && selectedWork && <section className="shoal-task" aria-label={`${selectedNode.name} task`} aria-live="polite">
        <div className="shoal-task-heading"><h2>{selectedNode.name}</h2><button type="button" className="shoal-close" aria-label="Close task" onClick={() => setSelected(null)}><X size={16} /></button></div>
        {selectedWork.task && <p>{selectedWork.task}</p>}
        {selectedWork.output && <p className="shoal-output">{selectedWork.output}</p>}
        <SourceLinks sources={selectedWork.sources} />
      </section>}
      {snapshot?.summary && <section className="shoal-result" aria-label="Dive findings"><h2>Findings</h2><p>{snapshot.summary}</p><SourceLinks sources={snapshot.sources} /></section>}
      {notice && <output className="shoal-notice">{notice}</output>}
    </Ocean>
  </div>;
}
