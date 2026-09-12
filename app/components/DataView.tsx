import { buzz, useBuzz, apply } from "@/lib/buzz/store";
import type { DocumentRecord } from "@/lib/buzz/types";
import { useAgentMembers } from "@/lib/workspace-members";
import { AgentAvatar } from "@/components/AgentAvatar";
import "./data-reef.css";
import { PageHeader } from "@/components/buzz/PageHeader";
import { SelectField } from "@/components/SelectField";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Eye,
  Check,
  Cloud,
  File as FileIcon,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  Info,
  Link2,
  ArrowRight,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Level = "Public" | "Internal" | "Confidential" | "Restricted";
type DataItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  collection: string;
  level: Level;
  updated: string;
  owner: string;
  audiences: string[];
  agents: string[];
  example?: boolean;
  file?: File;
  mime: string;
  status: DocumentRecord["status"];
  chunkCount: number;
  error?: string | null;
  path?: string;
};
type Props = { onNotify?: (message: string) => void };
const levels: Level[] = ["Public", "Internal", "Confidential", "Restricted"];
const descriptions: Record<Level, string> = {
  Public: "Approved public material. Eligible for local and cloud agents.",
  Internal: "For your workspace. Eligible for approved local and cloud agents.",
  Confidential: "Limited team access. Local agents only in this policy.",
  Restricted: "Named access only. Local agents only in this policy.",
};
const initialCollections = [
  "Company knowledge",
  "Engineering",
  "Customer operations",
  "Business & finance",
];
const audienceOptions = [
  "Everyone in workspace",
  "Engineering",
  "Customer operations",
  "Leadership",
  "Finance",
];
function bytes(n: number) {
  return n < 1000
    ? `${n} B`
    : n < 1000000
      ? `${(n / 1000).toFixed(n < 10000 ? 1 : 0)} KB`
      : `${(n / 1000000).toFixed(1)} MB`;
}
function localOnly(level: Level) {
  return level === "Confidential" || level === "Restricted";
}
function kind(file: {name: string}) {
  return (
    (
      {
        pdf: "PDF",
        md: "Markdown",
        txt: "Text",
        csv: "Spreadsheet",
        xlsx: "Spreadsheet",
        json: "JSON",
        docx: "Document",
        png: "Image",
        jpg: "Image",
        jpeg: "Image",
        webp: "Image",
      } as Record<string, string>
    )[file.name.split(".").pop()?.toLowerCase() || ""] || "File"
  );
}
function textLike(item: DataItem) { return item.mime.startsWith("text/") || /\.(md|txt|csv|json|yaml|yml|log|xml|html|js|ts|py|css|sql)$/i.test(item.name); }
function documentState(item: DataItem) {
  if (item.status === "ready") return item.chunkCount ? `Indexed · ${item.chunkCount} chunks` : "Indexed";
  return ({received:"Received",extracting:"Extracting text…",indexing:"Indexing…",failed:"Stored · not searchable",stale:"Stale · needs reindex"} as const)[item.status];
}
function FileGlyph({ type }: { type: string }) {
  const Icon =
    type === "Spreadsheet"
      ? FileSpreadsheet
      : type === "JSON"
        ? FileCode2
        : type === "Image"
          ? FileImage
          : FileText;
  return (
    <span className={`data-file-icon data-file-icon-${type.toLowerCase()}`}>
      <Icon size={20} strokeWidth={1.7} />
    </span>
  );
}
function LevelBadge({ level }: { level: Level }) {
  return (
    <span className={`data-level data-level-${level.toLowerCase()}`}>
      <span />
      {level}
    </span>
  );
}


const reefRegions: Record<Level, {
  path: string; mobilePath: string; label: [number, number]; mobileLabel: [number, number];
  spots: [number, number][]; mobileSpots: [number, number][];
}> = {
  Public: {
    path: "M0 0H1000V600H0Z", mobilePath: "M0 0H400V1000H0Z",
    label: [7, 8], mobileLabel: [8, 3],
    spots: [[14, 29], [12, 51], [20, 73]], mobileSpots: [[27, 14], [73, 14], [44, 23]],
  },
  Internal: {
    path: "M396 -10C387 107 208 105 218 249C227 393 451 328 414 610H1010V-10Z",
    mobilePath: "M-10 265C126 310 223 200 410 280V1010H-10Z",
    label: [43, 10], mobileLabel: [8, 27],
    spots: [[40, 28], [36, 49], [49, 72]], mobileSpots: [[29, 39], [73, 40], [44, 49]],
  },
  Confidential: {
    path: "M737 -10C723 132 467 122 491 310C515 464 671 401 599 610H1010V-10Z",
    mobilePath: "M-10 543C113 484 268 603 410 529V1010H-10Z",
    label: [68, 24], mobileLabel: [8, 55],
    spots: [[64, 41], [65, 62], [68, 80]], mobileSpots: [[29, 67], [73, 68], [44, 76]],
  },
  Restricted: {
    path: "M1010 210C849 182 762 250 776 367C791 465 771 536 826 610H1010Z",
    mobilePath: "M-10 811C126 886 237 762 410 835V1010H-10Z",
    label: [84, 48], mobileLabel: [8, 81],
    spots: [[89, 65], [91, 84], [84, 96]], mobileSpots: [[28, 93], [73, 93], [48, 99]],
  },
};
function reefPosition(x: number, y: number, mx: number, my: number): CSSProperties {
  return { "--reef-x": `${x}%`, "--reef-y": `${y}%`, "--reef-mx": `${mx}%`, "--reef-my": `${my}%` } as CSSProperties;
}

export function DataView({ onNotify }: Props) {
  const directoryAgents = useAgentMembers();
  const resolveAgent = (value: string) => directoryAgents.find(member => member.id === value || member.name === value.split(" · ")[0]);
  const { documents, collections: serverCollections } = useBuzz();
  const items = useMemo<DataItem[]>(() => documents.map(doc => ({ ...doc, type: kind(doc), mime: doc.type, updated: doc.updatedAt, example: false })), [documents]);
  const [localCollections, setCollections] = useState(initialCollections);
  const collections = useMemo(() => Array.from(new Set([...serverCollections, ...localCollections])), [serverCollections, localCollections]);
  const collection = "All data";
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All classifications");
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [levelPages, setLevelPages] = useState<Record<Level, number>>({ Public: 0, Internal: 0, Confidential: 0, Restricted: 0 });
  const [sort] = useState("recent");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [dropLevel, setDropLevel] = useState<Level | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [importLevel, setImportLevel] = useState<Level>("Internal");
  const [importCollection, setImportCollection] = useState("Company knowledge");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const importingRef = useRef(false);
  const [importAgents, setImportAgents] = useState<string[]>([]);
  const patchQueue = useRef<Promise<void>>(Promise.resolve());
  const [patching, setPatching] = useState(false);
  const pendingPatches = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DataItem | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const selected = items.find((item) => item.id === selectedId);
  const notify = (message: string) => {
    setStatusMessage(message);
    onNotify?.(message);
  };
  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
  }, [importOpen]);
  useEffect(() => {
    if (!previewItem || !textLike(previewItem)) return;
    const controller = new AbortController();
    fetch(buzz.documentUrl(previewItem.id), {signal: controller.signal}).then(response => {
      if (!response.ok) throw new Error("File preview unavailable.");
      return response.text();
    }).then(text => { if (!controller.signal.aborted) setPreviewText(text.slice(0,64000) + (text.length > 64000 ? "\n\n— Preview limited to the first 64 KB —" : "")); })
      .catch(() => { if (!controller.signal.aborted) setPreviewText("This file could not be read. Download it to open it."); })
      .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false); });
    return () => controller.abort();
  }, [previewItem]);
  const openPreview = (item: DataItem | null) => {
    setPreviewText(""); setPreviewUrl(""); setPreviewLoading(false);
    if (item && (/^image\/(png|jpeg|webp|gif|avif)$/.test(item.mime) || item.mime === "application/pdf")) setPreviewUrl(buzz.documentUrl(item.id) + "&preview=1");
    else if (item && textLike(item)) setPreviewLoading(true);
    setPreviewItem(item);
  };
  const visible = useMemo(
    () =>
      items
        .filter(
          (item) =>
            (collection === "All data" || item.collection === collection) &&
            (levelFilter === "All classifications" || item.level === levelFilter) &&
            `${item.name} ${item.owner} ${item.type}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "size"
              ? b.size - a.size
              : b.updated.localeCompare(a.updated),
        ),
    [items, collection, levelFilter, query, sort],
  );
  const startImport = () => {
    if (importingRef.current) return;
    setPendingFiles([]);
    setImportAgents([]);
    setImportError("");
    setImportCollection(collection === "All data" ? collections[0] : collection);
    setImportOpen(true);
  };
  const receiveFiles = (files: FileList | File[] | null) => {
    if (!files?.length || importingRef.current) return;
    // Classification is selected in the import dialog before any local item is created.
    // Keep the current collection when a drop starts from a filtered collection.
    if (!importOpen) setImportCollection(collection === "All data" ? collections[0] : collection);
    setPendingFiles(Array.from(files));
    setImportError("");
    setImportOpen(true);
  };
  const finishImport = async () => {
    if (importingRef.current) return;
    if (!pendingFiles.length) { setImportError("Choose at least one file to add."); return; }
    const grants = importAgents.filter(id => { const member = resolveAgent(id); return member && levels.indexOf(member.accessLevel) >= levels.indexOf(importLevel) && (!localOnly(importLevel) || member.runtime === "local"); });
    if (importLevel === "Restricted" && !grants.length) { setImportError("Choose at least one member with Restricted clearance."); return; }
    importingRef.current = true; setImporting(true); setImportError("");
    const failed: File[] = []; const failures: string[] = []; let added = 0;
    try {
      for (const file of pendingFiles) {
        try {
          const doc = await buzz.importDocument(file, {collection: importCollection, level: importLevel, owner: "you", audiences: localOnly(importLevel) ? [] : ["Everyone in workspace"], agents: grants});
          added++;
          if (doc.status === "failed" || doc.error) notify(`${file.name}: ${doc.error || "Stored, but not searchable."}`);
        } catch (error) { failed.push(file); failures.push(`${file.name}: ${error instanceof Error ? error.message : "Import failed."}`); }
      }
      setPendingFiles(failed);
      if (failed.length) setImportError(failures.join("\n")); else setImportOpen(false);
      setLevelFilter("All classifications"); setQuery("");
      if (added) notify(`${added} ${added === 1 ? "file added" : "files added"}.`);
    } finally { importingRef.current = false; setImporting(false); }
  };
  const patchItem = (id: string, patch: Partial<DataItem>) => {
    pendingPatches.current++; setPatching(true);
    const fields = Object.fromEntries(Object.entries(patch).filter(([key]) => ["level", "collection", "agents", "audiences"].includes(key)));
    const job = patchQueue.current.then(async () => {
      const response = await fetch('/api/documents', {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,...fields})});
      const value: unknown = await response.json();
      if (!response.ok || !value || typeof value !== 'object' || !('document' in value)) throw new Error(value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'Could not update document permissions.');
      const document = value.document as DocumentRecord;
      apply([{seq:0,ts:document.updatedAt,type:'document.updated',payload:{document}}]);
    });
    patchQueue.current = job.catch(error => notify(error instanceof Error ? error.message : "Could not update source.")).finally(() => { pendingPatches.current--; setPatching(pendingPatches.current > 0); });
    return job;
  };
  const changeLevel = (item: DataItem, level: Level) => {
    void patchItem(item.id, {
      level,
      agents: item.agents.flatMap(value => {
        const agent = resolveAgent(value);
        return agent && (!localOnly(level) || agent.runtime === "local") && levels.indexOf(agent.accessLevel) >= levels.indexOf(level) ? [agent.id] : [];
      }),
      audiences: localOnly(level)
        ? item.audiences.filter((a) => a !== "Everyone in workspace")
        : item.audiences,
    }).then(() => notify(`Classification updated to ${level}.`)).catch(() => {});
  };
  const download = (item: DataItem) => {
    const anchor = document.createElement("a"); anchor.href = buzz.documentUrl(item.id); anchor.download = item.name;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); notify("Download started.");
  };
  const remove = async (item: DataItem) => {
    try { await buzz.deleteDocument(item.id); setSelectedId(null); if (connectedId === item.id) setConnectedId(null); notify("Source removed."); }
    catch(error) { notify(error instanceof Error ? error.message : "Could not remove source."); }
  };
  const addCollection = () => {
    const name = newCollection.trim();
    if (!name) {
      setCollectionError("Give your collection a name.");
      return;
    }
    if (
      collections.some((c) => c.toLowerCase() === name.toLowerCase()) ||
      name.toLowerCase() === "all data"
    ) {
      setCollectionError("A collection with that name already exists.");
      return;
    }
    setCollections((current) => [...current, name]);
    setCollectionOpen(false);
    setNewCollection("");
    notify(`Created ${name}.`);
  };

  const connectedItem = items.find(item => item.id === connectedId);
  const canUse = (agent: (typeof directoryAgents)[number], level: Level) =>
    levels.indexOf(agent.accessLevel) >= levels.indexOf(level) && (!localOnly(level) || agent.runtime === "local");
  const accessPreviewLevel = dragging || draggedId ? dropLevel : null;
  const dropInto = (event: DragEvent<Element>, level: Level) => {
    event.preventDefault();
    event.stopPropagation();
    setDropLevel(null);
    setDragging(false);
    setDraggedId(null);
    dragDepth.current = 0;
    const id = event.dataTransfer.getData("application/x-relay-file");
    if (id) {
      const item = items.find(file => file.id === id);
      if (item && item.level !== level) changeLevel(item, level);
    } else if (event.dataTransfer.files.length) {
      setImportLevel(level);
      receiveFiles(event.dataTransfer.files);
    }
  };
  const overRegion = (event: DragEvent<Element>, level: Level) => {
    if (!event.dataTransfer.types.some(type => type === "Files" || type === "application/x-relay-file")) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = event.dataTransfer.types.includes("application/x-relay-file") ? "move" : "copy";
    setDropLevel(level);
    if (event.dataTransfer.types.includes("Files")) setDragging(true);
  };
  const reefFiles = levels.flatMap(level => {
    const matches = visible.filter(item => item.level === level);
    const pageSize = level === "Restricted" ? 2 : 3;
    const pageCount = Math.ceil(matches.length / pageSize);
    const page = pageCount ? levelPages[level] % pageCount : 0;
    return matches.slice(page * pageSize, page * pageSize + pageSize).map((item, index) => ({
      item, spot: reefRegions[level].spots[index], mobileSpot: reefRegions[level].mobileSpots[index],
    }));
  });
  const connectedPosition = reefFiles.find(({item}) => item.id === connectedId);
  const toggleConnection = (agent: (typeof directoryAgents)[number]) => {
    if (!connectedItem || !canUse(agent, connectedItem.level)) return;
    const isLinked = connectedItem.agents.some(value => resolveAgent(value)?.id === agent.id);
    void patchItem(connectedItem.id, {
      agents: isLinked
        ? connectedItem.agents.filter(value => resolveAgent(value)?.id !== agent.id)
        : [...connectedItem.agents.filter(value => resolveAgent(value)?.id !== agent.id), agent.id],
    }).then(() => notify(`${agent.name} ${isLinked ? "removed from" : "added to"} this file’s access settings.`)).catch(() => {});
  };

  return (
    <div
      className={`page data-page quality-data shoal-reef-page ${dragging || draggedId ? "reef-dragging" : ""}`}
      onDragEnter={event => {
        if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); dragDepth.current++; setDragging(true); }
      }}
      onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDragLeave={event => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        dragDepth.current = 0; setDragging(false); setDropLevel(null);
      }}
      onDrop={event => {
        event.preventDefault(); dragDepth.current = 0; setDragging(false); setDraggedId(null); setDropLevel(null);
        receiveFiles(event.dataTransfer.files);
      }}
    >
      <PageHeader className="page-heading" title="Data" action={
        <div className="data-heading-actions">
          <button className="btn btn-secondary reef-policy" aria-label="Access policy" onClick={() => setPolicyOpen(true)}><ShieldCheck size={16}/><span>Access policy</span></button>
        </div>
      } />
      <section className="reef-workspace" aria-label="Security reef">
        <div className={`reef-world ${connectedItem ? "has-connection" : ""}`}>
          <div className={`reef-agent-bank ${connectedItem ? "is-editing" : ""} ${accessPreviewLevel ? "is-previewing" : ""}`} data-preview-level={accessPreviewLevel || undefined}>
            <div className="reef-agent-context" aria-live="polite"><Link2 size={15}/>{accessPreviewLevel ? <span>Eligible at {accessPreviewLevel}</span> : connectedItem ? <><span>{connectedItem.name}</span><button className="reef-icon-button" aria-label="Close agent connections" onClick={() => setConnectedId(null)}><X size={15}/></button></> : <span>Choose a file’s <Link2 size={13}/> to connect its agents</span>}</div>
            <div className="reef-agent-dock">
              {directoryAgents.map(agent => {
                const eligible = !!connectedItem && canUse(agent, connectedItem.level);
                const assigned = !!connectedItem?.agents.some(value => resolveAgent(value)?.id === agent.id) && eligible;
                const previewEligible = accessPreviewLevel ? canUse(agent, accessPreviewLevel) : null;
                const highlighted = previewEligible ?? assigned;
                const locked = previewEligible === false || (!accessPreviewLevel && !!connectedItem && !eligible);
                return <button key={agent.id} className={`reef-agent ${highlighted ? "is-assigned" : ""} ${previewEligible === true ? "is-preview-eligible" : previewEligible === false ? "is-preview-blocked" : ""}`} disabled={patching || !!accessPreviewLevel || !eligible} aria-pressed={assigned} onClick={() => toggleConnection(agent)} title={accessPreviewLevel ? `${agent.name}: ${previewEligible ? "eligible" : "not eligible"} at ${accessPreviewLevel}` : connectedItem ? eligible ? `${assigned ? "Remove" : "Allow"} ${agent.name} for ${connectedItem.name}` : `${agent.name}: insufficient clearance or cloud runtime` : `${agent.name} · ${agent.accessLevel} · ${agent.runtime}`}>
                  <span className="reef-agent-portrait"><AgentAvatar identityKey={agent.id} character={agent.character} label={agent.name} size={52}/>{highlighted ? <span className="reef-agent-check"><Eye size={12}/></span> : locked ? <span className="reef-agent-lock"><LockKeyhole size={11}/></span> : null}</span><span>{agent.name}</span><small>{agent.runtime === "local" ? <HardDrive size={10}/> : <Cloud size={10}/>} {agent.runtime}</small>
                </button>;
              })}
              {!directoryAgents.length && <span className="reef-no-agents">Add members in Habitats to configure access.</span>}
            </div>
          </div>
          <div className="reef-canvas" onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropLevel(null); }}>
            <div className="reef-map-caption"><span>OPEN WATER</span><span>DEEPER = MORE PRIVATE <ArrowRight size={12}/></span></div>
            {([false, true] as const).map(mobile => (
              <svg key={String(mobile)} className={`reef-map ${mobile ? "reef-map-mobile" : "reef-map-desktop"}`} viewBox={mobile ? "0 0 400 1000" : "0 0 1000 600"} preserveAspectRatio="none" aria-hidden="true">
                {levels.map(level => <path key={level} d={mobile ? reefRegions[level].mobilePath : reefRegions[level].path}
                  className={`reef-water reef-water-${level.toLowerCase()} ${dropLevel === level ? "is-drop-target" : ""} ${levelFilter !== "All classifications" && levelFilter !== level ? "is-muted" : ""}`}
                  onDragEnter={event => overRegion(event, level)} onDragOver={event => overRegion(event, level)} onDrop={event => dropInto(event, level)}/>) }
              </svg>
            ))}
            <svg className="reef-connections" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
              {connectedPosition && directoryAgents.map((agent, index) => {
                if (!connectedItem?.agents.some(value => resolveAgent(value)?.id === agent.id) || !canUse(agent, connectedItem.level)) return null;
                const x = connectedPosition.spot[0] * 10, y = connectedPosition.spot[1] * 6;
                const target = ((index + .5) / directoryAgents.length) * 900 + 50;
                return <path key={agent.id} d={`M ${x} ${y - 30} C ${x} ${y - 100}, ${target} 90, ${target} 0`} />;
              })}
            </svg>
            {levels.map(level => {
              const region = reefRegions[level];
              const count = visible.filter(item => item.level === level).length;
              const pageSize = level === "Restricted" ? 2 : 3;
              return <div key={level} style={reefPosition(...region.label, ...region.mobileLabel)} className={`reef-region-label reef-region-${level.toLowerCase()} ${levelFilter !== "All classifications" && levelFilter !== level ? "is-muted" : ""}`} onDragOver={event => overRegion(event, level)} onDrop={event => dropInto(event, level)}>
                <div><span className="reef-depth-mark" aria-hidden="true">{Array.from({length: levels.indexOf(level) + 1}, (_,i) => <i key={i}/>)}</span><strong>{level}</strong><button className="reef-region-add" aria-label={`Add files to ${level}`} onClick={() => { startImport(); setImportLevel(level); }}><Plus size={15}/></button></div>
                <small>{localOnly(level) ? <LockKeyhole size={11}/> : <Cloud size={11}/>} {localOnly(level) ? "Local only" : "Local + cloud"}{count > pageSize && <button className="reef-page-turn" onClick={() => setLevelPages(current => ({...current, [level]: current[level] + 1}))} aria-label={`Show next ${level} files`}>{Math.min(count, ((levelPages[level] % Math.ceil(count / pageSize)) + 1) * pageSize)} / {count}<ArrowRight size={13}/></button>}</small>
              </div>;
            })}
            {reefFiles.map(({item, spot, mobileSpot}, index) => <div key={item.id}
              style={{...reefPosition(...spot, ...mobileSpot), "--reef-turn": `${index % 2 ? 2 : -3}deg`} as CSSProperties}
              className={`reef-document ${connectedId === item.id ? "is-connected" : ""} ${draggedId === item.id ? "is-dragged" : ""}`}
              draggable onDragStart={event => { event.dataTransfer.setData("application/x-relay-file", item.id); event.dataTransfer.effectAllowed = "move"; setDraggedId(item.id); }}
              onDragEnd={() => { setDraggedId(null); setDropLevel(null); setDragging(false); }}
              onDragOver={event => overRegion(event, item.level)} onDrop={event => dropInto(event, item.level)}>
              <button className="reef-document-open" onClick={() => setSelectedId(item.id)} aria-label={`View details for ${item.name}`}>
                <span className="reef-paper"><FileGlyph type={item.type}/><span className="reef-paper-lines" aria-hidden="true"><i/><i/><i/></span><span className="reef-paper-type">{item.type}</span></span>
                <strong>{item.name}</strong><small>{item.example ? "Example" : bytes(item.size)}</small>
              </button>
              <button className="reef-connect-handle" aria-label={`Manage agent connections for ${item.name}`} aria-pressed={connectedId === item.id} onClick={() => setConnectedId(connectedId === item.id ? null : item.id)}><Link2 size={15}/></button>
            </div>)}
            {!visible.length && <div className="reef-no-results"><Search size={22}/><strong>{query || levelFilter !== "All classifications" ? "No matching files" : "Make this water yours"}</strong><button className="btn btn-secondary" onClick={() => { if(query || levelFilter !== "All classifications") { setQuery(""); setLevelFilter("All classifications"); } else startImport(); }}>{query || levelFilter !== "All classifications" ? "Clear filters" : "Add data"}</button></div>}
            {(dragging || draggedId) && <div className="reef-drop-instruction"><UploadCloud size={16}/>{dropLevel ? `Release into ${dropLevel}` : "Drop into a security depth"}</div>}
          </div>
        </div>
        <footer className="reef-footer"><span><span className="reef-drag-cursor" aria-hidden="true">↗</span> Drag to change security <span aria-hidden="true">·</span> Click to manage</span><span><HardDrive size={12}/> Workspace documents</span></footer>
      </section>
      <output className="data-sr-only" aria-live="polite">{statusMessage}</output>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (importingRef.current) return;
          setImportOpen(open);
          if (!open) setPendingFiles([]);
        }}
      >
        <DialogContent className="data-dialog quality-data-dialog">
          <DialogHeader>
            <DialogTitle>Import files</DialogTitle>
            <DialogDescription className="sr-only">
              Choose files and a classification.
            </DialogDescription>
          </DialogHeader>
          <form
            className="data-import-form"
            onSubmit={(event) => {
              event.preventDefault();
              void finishImport();
            }}
          >
            <div className="field">
              <label className="field-label" htmlFor="data-import-collection">
                Collection
              </label>
              <SelectField
                id="data-import-collection"
                className="select"
                value={importCollection}
                onChange={(event) => setImportCollection(event.target.value)}
              >
                {collections.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </SelectField>
            </div>
            <fieldset className="data-security-fieldset">
              <legend className="field-label">Classification</legend>
              <div className="data-security-options">
                {levels.map((level) => (
                  <label
                    className={`data-security-option ${importLevel === level ? "selected" : ""}`}
                    key={level}
                  >
                    <input
                      type="radio"
                      name="import-classification"
                      value={level}
                      checked={importLevel === level}
                      onChange={() => { setImportLevel(level); setImportAgents(current => current.filter(id => { const member = resolveAgent(id); return member && levels.indexOf(member.accessLevel) >= levels.indexOf(level) && (!localOnly(level) || member.runtime === "local"); })); }}
                    />
                    <div>
                      <LevelBadge level={level} />
                      <p>{descriptions[level]}</p>
                    </div>
                    {importLevel === level && <Check size={16} />}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset><legend className="field-label">Member access</legend>{directoryAgents.map(member => <label className="data-checkbox-row" key={member.id}><input type="checkbox" checked={importAgents.includes(member.id)} disabled={importing || levels.indexOf(member.accessLevel) < levels.indexOf(importLevel) || (localOnly(importLevel) && member.runtime === "cloud")} onChange={event => setImportAgents(current => event.target.checked ? [...current,member.id] : current.filter(id => id !== member.id))}/><AgentAvatar identityKey={member.id} character={member.character} label={member.name} size={24}/><span>{member.name}</span></label>)}</fieldset>
            <div className="data-picker-box">
              <UploadCloud size={23} />
              <strong>
                {pendingFiles.length
                  ? `${pendingFiles.length} ${pendingFiles.length === 1 ? "file" : "files"} selected · ${bytes(pendingFiles.reduce((sum, file) => sum + file.size, 0))}`
                  : "Select the files you want to add"}
              </strong>
              <div className="data-picker-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInput.current?.click()}
                >
                  Choose files
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => folderInput.current?.click()}
                >
                  <Folder size={15} />
                  Choose folder
                </button>
              </div>
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  receiveFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <input
                ref={folderInput}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  receiveFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
            {pendingFiles.length > 0 && (
              <ul className="data-pending-files">
                {pendingFiles.slice(0, 5).map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <FileIcon size={14} />
                    <span>{file.webkitRelativePath || file.name}</span>
                    <small>{bytes(file.size)}</small>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${file.name} from selection`}
                      onClick={() =>
                        setPendingFiles((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
                {pendingFiles.length > 5 && (
                  <li className="muted">and {pendingFiles.length - 5} more files</li>
                )}
              </ul>
            )}
            {importError && (
              <p className="data-form-error" role="alert">
                {importError}
              </p>
            )}

            <DialogFooter>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={importing} onClick={() => setImportOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={importing}>
                <Plus size={16} />
                {importing ? "Importing…" : "Import"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="data-dialog data-detail-dialog quality-data-dialog">
          {selected && (
            <>
              <DialogHeader>
                <div className="data-detail-title">
                  <FileGlyph type={selected.type} />
                  <div>
                    <DialogTitle>{selected.name}</DialogTitle>
                    <DialogDescription>
                      {selected.type} · {bytes(selected.size)} ·{" "}
                      {documentState(selected)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="data-detail-state">
                <span className={`data-file-state ${selected.example ? "" : "available"}`}>
                  {selected.example ? <Info size={15} /> : <HardDrive size={15} />}
                  {documentState(selected)}
                </span>
                <span>{selected.error || "Stored in workspace"}</span>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label" htmlFor="data-detail-collection">
                    Collection
                  </label>
                  <SelectField
                    className="select"
                    id="data-detail-collection"
                    disabled={patching} value={selected.collection}
                    onChange={(event) => {
                      void patchItem(selected.id, {
                        collection: event.target.value,
                      }).then(() => notify("Collection updated.")).catch(() => {});
                    }}
                  >
                    {collections.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </SelectField>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="data-detail-level">
                    Classification
                  </label>
                  <SelectField
                    className="select"
                    id="data-detail-level"
                    disabled={patching} value={selected.level}
                    onChange={(event) => changeLevel(selected, event.target.value as Level)}
                  >
                    {levels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </SelectField>
                </div>
              </div>
              <div className={`data-routing-note ${localOnly(selected.level) ? "local" : ""}`}>
                {localOnly(selected.level) ? <HardDrive size={19} /> : <Cloud size={19} />}
                <div>
                  <strong>
                    {localOnly(selected.level)
                      ? "Local inference only"
                      : "Local and approved cloud inference"}
                  </strong>
                  <p>{descriptions[selected.level]}</p>
                </div>
              </div>
              <div className="data-detail-access">
                <fieldset>
                  <legend>Audiences</legend>
                  {audienceOptions.map((audience) => (
                    <label className="data-checkbox-row" key={audience}>
                      <input
                        type="checkbox"
                        checked={selected.audiences.includes(audience)}
                        disabled={patching || localOnly(selected.level) && audience === "Everyone in workspace"}
                        onChange={(event) =>
                          patchItem(selected.id, {
                            audiences: event.target.checked
                              ? [...selected.audiences, audience]
                              : selected.audiences.filter((a) => a !== audience),
                          })
                        }
                      />
                      <span>{audience}</span>
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Agents</legend>
                  {directoryAgents.map((agent) => (
                    <label className="data-checkbox-row" key={agent.id}>
                      <input
                        type="checkbox"
                        checked={canUse(agent, selected.level) && selected.agents.some(value => resolveAgent(value)?.id === agent.id)}
                        disabled={patching || (localOnly(selected.level) && agent.runtime === "cloud") || levels.indexOf(agent.accessLevel) < levels.indexOf(selected.level)}
                        onChange={(event) =>
                          patchItem(selected.id, {
                            agents: event.target.checked
                              ? [...selected.agents.filter(value => resolveAgent(value)?.id !== agent.id), agent.id]
                              : selected.agents.filter(value => resolveAgent(value)?.id !== agent.id),
                          })
                        }
                      />
                      <AgentAvatar identityKey={agent.id} character={agent.character} label={agent.name} size={24} /><span>{agent.name}</span>
                      {((localOnly(selected.level) && agent.runtime === "cloud") || levels.indexOf(agent.accessLevel) < levels.indexOf(selected.level)) && (
                        <LockKeyhole size={12} />
                      )}
                    </label>
                  ))}
                </fieldset>
              </div>
              {selected.path && (
                <div className="detail-row">
                  <span className="detail-label">Folder path</span>
                  <span className="data-file-path">{selected.path}</span>
                </div>
              )}
              <div className="data-detail-footer">
                <button
                  className="btn data-delete-button"
                  onClick={() => {
                    void remove(selected);
                  }}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
                <div>
                  {!selected.example ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => download(selected)}
                        aria-label={`Download ${selected.name}`}
                      >
                        <ArrowDownToLine size={16} />
                        Download
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedId(null);
                          openPreview(selected);
                        }}
                      >
                        Preview <ArrowUpRight size={15} />
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-secondary" onClick={() => setSelectedId(null)}>
                      Done
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) openPreview(null);
        }}
      >
        <DialogContent className="data-dialog data-preview-dialog quality-data-dialog">
          <DialogHeader>
            <DialogTitle>{previewItem?.name}</DialogTitle>
            <DialogDescription>Workspace file</DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="empty-state">Reading file…</div>
          ) : previewUrl ? (
            previewItem?.mime === "application/pdf" ? (
              <iframe className="data-pdf-preview" src={previewUrl} title={previewItem.name} />
            ) : (
              <div className="data-image-preview">
                {/* Local blob URLs cannot use the remote image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={`Preview of ${previewItem?.name}`} />
              </div>
            )
          ) : previewText || (previewItem && textLike(previewItem)) ? (
            <pre className="data-text-preview">{previewText || "Empty file"}</pre>
          ) : (
            <div className="empty-state">
              <FileIcon size={32} />
              <h3>Preview unavailable for this format</h3>
              <p>Download the file to open it in its native app.</p>
            </div>
          )}
          <DialogFooter>
            <button className="btn btn-secondary" onClick={() => openPreview(null)}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={() => previewItem && download(previewItem)}
            >
              <ArrowDownToLine size={16} />
              Download local copy
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="data-dialog quality-data-dialog">
          <DialogHeader>
            <DialogTitle>Access policy</DialogTitle>
            <DialogDescription>
              Every source carries a classification. Agents should inherit the most restrictive rule
              across the context they use.
            </DialogDescription>
          </DialogHeader>
          <div className="data-policy-list">
            {levels.map((level) => (
              <div key={level}>
                <LevelBadge level={level} />
                <p>{descriptions[level]}</p>
                <span>
                  {localOnly(level) ? (
                    <>
                      <HardDrive size={14} />
                      Local only
                    </>
                  ) : (
                    <>
                      <Cloud size={14} />
                      Local + cloud
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="data-policy-principles">
            <strong>
              <ShieldCheck size={17} />
              Designed for permission-aware context
            </strong>
            <p>
              Retrieval, citations, generated summaries, and tool actions must all respect source
              permissions. Moving work to a cloud agent must never silently move restricted data
              with it.
            </p>
          </div>

          <DialogFooter>
            <button className="btn btn-primary" onClick={() => setPolicyOpen(false)}>
              Got it
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
        <DialogContent className="data-dialog data-small-dialog quality-data-dialog">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>Organize related sources into a collection</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              addCollection();
            }}
          >
            <div className="field">
              <label className="field-label" htmlFor="new-data-collection">
                Collection name
              </label>
              <input
                id="new-data-collection"
                className="input"
                placeholder="e.g. Product research"
                value={newCollection}
                onChange={(event) => {
                  setNewCollection(event.target.value);
                  setCollectionError("");
                }}
                maxLength={50}
              />
            </div>
            {collectionError && (
              <p className="data-form-error" role="alert">
                {collectionError}
              </p>
            )}
            <DialogFooter>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCollectionOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <FolderPlus size={16} />
                Create collection
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
