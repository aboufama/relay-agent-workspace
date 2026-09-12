import { useAgentMembers } from "@/lib/workspace-members";
import { AgentAvatar } from "@/components/AgentAvatar";
import "./data-layers.css";
import "./data-visual.css";
import { PageHeader } from "@/components/buzz/PageHeader";
import { SelectField } from "@/components/SelectField";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Cloud,
  File as FileIcon,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Grid2X2,
  HardDrive,
  Info,
  List,
  Layers3,
  LockKeyhole,
  MoreHorizontal,
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
const agentOptions = ["Atlas · local", "Scout · local", "Quill · cloud"];
const seeds: DataItem[] = [
  {
    id: "ex-1",
    name: "Meridian company handbook.pdf",
    size: 2840000,
    type: "PDF",
    collection: "Company knowledge",
    level: "Internal",
    updated: "2026-09-11",
    owner: "Maya Chen",
    audiences: ["Everyone in workspace"],
    agents: ["Atlas · local", "Quill · cloud"],
    example: true,
  },
  {
    id: "ex-2",
    name: "Platform architecture.md",
    size: 24800,
    type: "Markdown",
    collection: "Engineering",
    level: "Confidential",
    updated: "2026-09-11",
    owner: "Alex Rivera",
    audiences: ["Engineering"],
    agents: ["Atlas · local"],
    example: true,
  },
  {
    id: "ex-3",
    name: "Customer onboarding playbook.pdf",
    size: 1420000,
    type: "PDF",
    collection: "Customer operations",
    level: "Internal",
    updated: "2026-09-10",
    owner: "Sam Taylor",
    audiences: ["Customer operations"],
    agents: ["Atlas · local", "Quill · cloud"],
    example: true,
  },
  {
    id: "ex-4",
    name: "Q4 operating plan.xlsx",
    size: 386000,
    type: "Spreadsheet",
    collection: "Business & finance",
    level: "Restricted",
    updated: "2026-09-09",
    owner: "Maya Chen",
    audiences: ["Leadership", "Finance"],
    agents: ["Atlas · local"],
    example: true,
  },
  {
    id: "ex-5",
    name: "Brand guidelines.pdf",
    size: 4200000,
    type: "PDF",
    collection: "Company knowledge",
    level: "Public",
    updated: "2026-09-08",
    owner: "Jamie Park",
    audiences: ["Everyone in workspace"],
    agents: ["Atlas · local", "Scout · local", "Quill · cloud"],
    example: true,
  },
  {
    id: "ex-6",
    name: "API reference.json",
    size: 164000,
    type: "JSON",
    collection: "Engineering",
    level: "Internal",
    updated: "2026-09-07",
    owner: "Alex Rivera",
    audiences: ["Engineering"],
    agents: ["Atlas · local", "Scout · local"],
    example: true,
  },
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
function kind(file: File) {
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

export function DataView({ onNotify }: Props) {
  const directoryAgents = useAgentMembers();
  const [items, setItems] = useState<DataItem[]>(seeds);
  const [collections, setCollections] = useState(initialCollections);
  const [collection, setCollection] = useState("All data");
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All classifications");
  const [layout, setLayout] = useState<"layers" | "list" | "grid">("layers");
  const [sort, setSort] = useState("recent");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [dropLevel, setDropLevel] = useState<Level | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [importLevel, setImportLevel] = useState<Level>("Internal");
  const [importCollection, setImportCollection] = useState("Company knowledge");
  const [importError, setImportError] = useState("");
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
    if (!previewItem?.file) return;
    let stopped = false;
    const file = previewItem.file;
    if (/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type) || file.type === "application/pdf") {
      return;
    }
    if (
      file.type.startsWith("text/") ||
      /\.(md|txt|csv|json|yaml|yml|log|xml|html|js|ts|py|css|sql)$/i.test(file.name)
    ) {
      file
        .slice(0, 64000)
        .text()
        .then((text) => {
          if (!stopped)
            setPreviewText(
              text + (file.size > 64000 ? "\n\n— Preview limited to the first 64 KB —" : ""),
            );
        })
        .catch(() => {
          if (!stopped)
            setPreviewText("This file could not be read. Download your local copy to open it.");
        })
        .finally(() => {
          if (!stopped) setPreviewLoading(false);
        });
    }
    return () => {
      stopped = true;
    };
  }, [previewItem]);
  const previewObjectUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    },
    [],
  );
  const openPreview = (item: DataItem | null) => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = null;
    setPreviewText("");
    setPreviewUrl("");
    setPreviewLoading(false);
    const file = item?.file;
    if (
      file &&
      (/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type) || file.type === "application/pdf")
    ) {
      const url = URL.createObjectURL(file);
      previewObjectUrl.current = url;
      setPreviewUrl(url);
    } else if (
      file &&
      (file.type.startsWith("text/") ||
        /\.(md|txt|csv|json|yaml|yml|log|xml|html|js|ts|py|css|sql)$/i.test(file.name))
    ) {
      setPreviewLoading(true);
    }
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
    setPendingFiles([]);
    setImportError("");
    setImportCollection(collection === "All data" ? collections[0] : collection);
    setImportOpen(true);
  };
  const receiveFiles = (files: FileList | File[] | null) => {
    if (!files?.length) return;
    // Classification is selected in the import dialog before any local item is created.
    // Keep the current collection when a drop starts from a filtered collection.
    if (!importOpen) setImportCollection(collection === "All data" ? collections[0] : collection);
    setPendingFiles(Array.from(files));
    setImportError("");
    setImportOpen(true);
  };
  const finishImport = () => {
    if (!pendingFiles.length) {
      setImportError("Choose at least one file to add.");
      return;
    }
    const newItems: DataItem[] = pendingFiles.map((file, index) => ({
      id: `local-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: kind(file),
      collection: importCollection,
      level: importLevel,
      updated: new Date().toISOString(),
      owner: "You",
      audiences:
        importLevel === "Public" || importLevel === "Internal" ? ["Everyone in workspace"] : [],
      agents: [],
      file,
      path: file.webkitRelativePath,
    }));
    setItems((current) => [...newItems, ...current]);
    setCollection(importCollection);
    setLevelFilter("All classifications");
    setQuery("");
    setImportOpen(false);
    setPendingFiles([]);
    notify(`${newItems.length} ${newItems.length === 1 ? "file added" : "files added"}.`);
  };
  const patchItem = (id: string, patch: Partial<DataItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const changeLevel = (item: DataItem, level: Level) => {
    patchItem(item.id, {
      level,
      agents: localOnly(level)
        ? item.agents.filter((agent) => !agent.includes("cloud"))
        : item.agents,
      audiences: localOnly(level)
        ? item.audiences.filter((a) => a !== "Everyone in workspace")
        : item.audiences,
    });
    notify(`Classification updated to ${level}.`);
  };
  const download = (item: DataItem) => {
    if (!item.file) return;
    const url = URL.createObjectURL(item.file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Downloaded your local file copy.");
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
    setCollection(name);
    setCollectionOpen(false);
    setNewCollection("");
    notify(`Created ${name}.`);
  };

  return (
    <div
      className={`page data-page quality-data data-visual ${layout === "layers" ? "data-visual-layers" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) {
          dragDepth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current--;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        receiveFiles(event.dataTransfer.files);
      }}
    >
      <PageHeader
        className="page-heading"
        title="Data"
        action={
          <div className="data-heading-actions">
            <button className="btn btn-secondary" onClick={() => setPolicyOpen(true)}>
              <ShieldCheck size={16} />
              Access policy
            </button>
            <button className="btn btn-primary" onClick={startImport}>
              <Plus size={17} />
              Add data
            </button>
          </div>
        }
      />

      <div className="data-workspace">
        <aside className="data-collections card" aria-label="Data collections">
          <div className="data-collections-header">
            <span className="eyebrow">COLLECTIONS</span>
            <button
              className="icon-btn"
              aria-label="New collection"
              onClick={() => {
                setCollectionError("");
                setCollectionOpen(true);
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            className={`data-collection ${collection === "All data" ? "active" : ""}`}
            aria-current={collection === "All data" ? "page" : undefined}
            onClick={() => setCollection("All data")}
          >
            <Grid2X2 size={16} />
            <span>All data</span>
            <small>{items.length}</small>
          </button>
          <div className="data-collection-divider" />
          {collections.map((name) => (
            <button
              className={`data-collection ${collection === name ? "active" : ""}`}
              aria-current={collection === name ? "page" : undefined}
              key={name}
              onClick={() => setCollection(name)}
            >
              <Folder size={16} />
              <span>{name}</span>
              <small>{items.filter((item) => item.collection === name).length}</small>
            </button>
          ))}
          <button
            className="data-new-collection"
            onClick={() => {
              setCollectionError("");
              setCollectionOpen(true);
            }}
          >
            <FolderPlus size={16} />
            New collection
          </button>
        </aside>
        <section className="data-library card" aria-label="Knowledge sources">
          <div className="data-library-heading">
            <div>
              <h2>{collection}</h2>
              <span>
                {visible.length} {visible.length === 1 ? "source" : "sources"}
              </span>
            </div>
            <div className="data-view-toggle" aria-label="View style">
              <button
                className={layout === "layers" ? "active" : ""}
                onClick={() => setLayout("layers")}
                aria-label="Security layers view"
                aria-pressed={layout === "layers"}
              >
                <Layers3 size={17} />
              </button>
              <button
                className={layout === "list" ? "active" : ""}
                onClick={() => setLayout("list")}
                aria-label="List view"
                aria-pressed={layout === "list"}
              >
                <List size={17} />
              </button>
              <button
                className={layout === "grid" ? "active" : ""}
                onClick={() => setLayout("grid")}
                aria-label="Grid view"
                aria-pressed={layout === "grid"}
              >
                <Grid2X2 size={16} />
              </button>
            </div>
          </div>
          <div className="data-library-toolbar">
            <label className="data-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your knowledge…"
                aria-label="Search knowledge sources"
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </label>
            <details className="data-visual-filters">
              <summary>Filter</summary>
              <div>
                {" "}
                <SelectField
                  className="select data-filter"
                  aria-label="Filter classification"
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value)}
                >
                  <option>All classifications</option>
                  {levels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </SelectField>
                <SelectField
                  className="select data-sort"
                  aria-label="Sort files"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="recent">Recently added</option>
                  <option value="name">Name A–Z</option>
                  <option value="size">Largest first</option>
                </SelectField>
              </div>
            </details>
          </div>
          {layout === "layers" ? (
            <div className="data-security-layers" aria-label="Security layers">
              <p className="data-visual-hint">
                Drag files between layers. Select a file to manage access.
              </p>
              {levels
                .filter((level) => levelFilter === "All classifications" || levelFilter === level)
                .map((level) => {
                  const files = visible.filter((item) => item.level === level);
                  const eligible = directoryAgents.filter(
                    (agent) =>
                      levels.indexOf(agent.accessLevel) >= levels.indexOf(level) &&
                      (!localOnly(level) || agent.runtime === "local"),
                  );
                  return (
                    <div
                      key={level}
                      className={`data-security-shelf${dropLevel === level ? " is-drop-target" : ""}`}
                      aria-label={`${level} files`}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDragging(false);
                        setDropLevel(level);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = event.dataTransfer.types.includes(
                          "application/x-relay-file",
                        )
                          ? "move"
                          : "copy";
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                          setDropLevel(null);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDropLevel(null);
                        setDragging(false);
                        dragDepth.current = 0;
                        const id = event.dataTransfer.getData("application/x-relay-file");
                        if (id) {
                          const item = items.find((file) => file.id === id);
                          if (item && item.level !== level) changeLevel(item, level);
                        } else if (event.dataTransfer.files.length) {
                          setImportLevel(level);
                          receiveFiles(event.dataTransfer.files);
                        }
                      }}
                    >
                      <header className="data-shelf-header">
                        <span className="data-shelf-index">0{levels.indexOf(level) + 1}</span>
                        <h3>{level}</h3>
                        <span className="data-shelf-count">{files.length}</span>
                        <button
                          className="icon-btn"
                          aria-label={`Add files to ${level}`}
                          onClick={() => {
                            startImport();
                            setImportLevel(level);
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </header>
                      <div className="data-shelf-files">
                        {files.map((item) => (
                          <div
                            aria-label={item.name}
                            key={item.id}
                            className="data-layer-file"
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("application/x-relay-file", item.id);
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => setDropLevel(null)}
                          >
                            <button
                              className="data-layer-file-open"
                              onClick={() => setSelectedId(item.id)}
                              aria-label={`View details for ${item.name}`}
                            >
                              <FileGlyph type={item.type} />
                              <span>
                                <strong>{item.name}</strong>
                              </span>
                            </button>
                          </div>
                        ))}
                        {!files.length && (
                          <button
                            className="data-shelf-empty"
                            onClick={() => {
                              startImport();
                              setImportLevel(level);
                            }}
                          >
                            <Plus size={18} aria-hidden="true" />
                            <span className="sr-only">Add files to {level}</span>
                          </button>
                        )}
                      </div>
                      <div className="data-shelf-access" aria-label={`${level} agent clearance`}>
                        <span className="data-access-wire" aria-hidden="true" />
                        <div className="data-access-end">
                          <span className="data-access-label">Access</span>
                          <div className="data-access-avatars">
                            {eligible.map((agent) => (
                              <span
                                key={agent.id}
                                className="data-access-agent"
                                title={`${agent.name} · ${agent.accessLevel} clearance`}
                              >
                                <AgentAvatar
                                  identityKey={agent.id}
                                  character={agent.character}
                                  label={agent.name}
                                  size={30}
                                />
                              </span>
                            ))}
                            {!eligible.length && (
                              <span className="data-access-none">
                                —
                                <span className="sr-only">No agents with sufficient clearance</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : !visible.length ? (
            <div className="empty-state data-empty">
              <Folder size={32} />
              <h3>
                {query || levelFilter !== "All classifications"
                  ? "No matching sources"
                  : "No files yet"}
              </h3>
              <p>
                {query || levelFilter !== "All classifications"
                  ? "Try a different search or classification."
                  : "Add your first file to this collection."}
              </p>
              {query || levelFilter !== "All classifications" ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuery("");
                    setLevelFilter("All classifications");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <button className="btn btn-primary" onClick={startImport}>
                  <Plus size={16} />
                  Add data
                </button>
              )}
            </div>
          ) : layout === "list" ? (
            <div className="table-wrap data-files-wrap">
              <table className="data-table data-files-table">
                <thead>
                  <tr>
                    <th>Source name</th>
                    <th>Classification</th>
                    <th>Access</th>
                    <th>State</th>
                    <th>
                      <span className="data-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button className="data-source-link" onClick={() => setSelectedId(item.id)}>
                          <FileGlyph type={item.type} />
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.type} <span>·</span> {bytes(item.size)} <span>·</span>{" "}
                              {item.owner}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <LevelBadge level={item.level} />
                      </td>
                      <td>
                        <span
                          className={`data-eligibility ${localOnly(item.level) ? "local" : ""}`}
                        >
                          {localOnly(item.level) ? <HardDrive size={14} /> : <Cloud size={14} />}
                          {localOnly(item.level) ? "Local only" : "Local + cloud"}
                        </span>
                      </td>
                      <td>
                        <span className={`data-file-state ${item.example ? "" : "available"}`}>
                          {item.example ? (
                            <span className="data-example-dot" />
                          ) : (
                            <Check size={13} />
                          )}
                          {item.example ? "No file attached" : "Local · not indexed"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={`View details for ${item.name}`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="data-files-grid">
              {visible.map((item) => (
                <button
                  className="data-file-card"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="data-file-card-top">
                    <FileGlyph type={item.type} />
                    <LevelBadge level={item.level} />
                  </div>
                  <strong>{item.name}</strong>
                  <span>{item.collection}</span>
                  <div className="data-file-card-bottom">
                    <small>{bytes(item.size)}</small>
                    <small>{item.example ? "No file attached" : "Local · not indexed"}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
          {layout !== "layers" && (
            <button className="data-dropzone" onClick={startImport}>
              <span className="data-drop-icon">
                <UploadCloud size={22} strokeWidth={1.6} />
              </span>
              <span>
                <strong>
                  Drop files here, or <em>browse</em>
                </strong>
                <small>Files and folders</small>
              </span>
              <span className="data-drop-privacy">
                <LockKeyhole size={13} />
                Browser only
              </span>
            </button>
          )}
        </section>
      </div>
      <output className="data-sr-only" aria-live="polite">
        {statusMessage}
      </output>
      {dragging && (
        <div className="data-drag-overlay">
          <div>
            <UploadCloud size={40} />
            <h2>Drop files to import</h2>
            <p>Drop files to choose their collection and security level.</p>
          </div>
        </div>
      )}

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
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
              finishImport();
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
                      onChange={() => setImportLevel(level)}
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
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} />
                Import
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
                      {selected.example ? "No file attached" : "Local file"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="data-detail-state">
                <span className={`data-file-state ${selected.example ? "" : "available"}`}>
                  {selected.example ? <Info size={15} /> : <HardDrive size={15} />}
                  {selected.example ? "No file attached" : "Local file available — not indexed"}
                </span>
                <span>{selected.example ? "No agent access" : "No network upload"}</span>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label" htmlFor="data-detail-collection">
                    Collection
                  </label>
                  <SelectField
                    className="select"
                    id="data-detail-collection"
                    value={selected.collection}
                    onChange={(event) => {
                      patchItem(selected.id, {
                        collection: event.target.value,
                      });
                      notify("Collection updated.");
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
                    value={selected.level}
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
                        disabled={localOnly(selected.level) && audience === "Everyone in workspace"}
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
                  {agentOptions.map((agent) => (
                    <label className="data-checkbox-row" key={agent}>
                      <input
                        type="checkbox"
                        checked={selected.agents.includes(agent)}
                        disabled={localOnly(selected.level) && agent.includes("cloud")}
                        onChange={(event) =>
                          patchItem(selected.id, {
                            agents: event.target.checked
                              ? [...selected.agents, agent]
                              : selected.agents.filter((a) => a !== agent),
                          })
                        }
                      />
                      <span>{agent}</span>
                      {localOnly(selected.level) && agent.includes("cloud") && (
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
                    setItems((current) => current.filter((item) => item.id !== selected.id));
                    setSelectedId(null);
                    notify("Source removed.");
                  }}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
                <div>
                  {selected.file ? (
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
            <DialogDescription>Local file</DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="empty-state">Reading local file…</div>
          ) : previewUrl ? (
            previewItem?.file?.type === "application/pdf" ? (
              <iframe className="data-pdf-preview" src={previewUrl} title={previewItem.name} />
            ) : (
              <div className="data-image-preview">
                {/* Local blob URLs cannot use the remote image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={`Preview of ${previewItem?.name}`} />
              </div>
            )
          ) : previewText ||
            (previewItem?.file &&
              (previewItem.file.type.startsWith("text/") ||
                /\.(md|txt|csv|json|yaml|yml|log|xml|html|js|ts|py|css|sql)$/i.test(
                  previewItem.file.name,
                ))) ? (
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
