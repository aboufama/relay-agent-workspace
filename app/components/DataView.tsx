import "./data-layers.css";
import { PageHeader } from "@/components/buzz/PageHeader";
import { SelectField } from "@/components/SelectField";
import { buzz, useBuzz } from "@/lib/buzz/store";
import type { DocumentRecord, Passage } from "@/lib/buzz/types";
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
// DocumentRecord.type is the MIME type; `kind` is the human label the UI shows.
type DataItem = DocumentRecord & { kind: string };
type Props = { onNotify?: (message: string) => void };
const levels: Level[] = ["Public", "Internal", "Confidential", "Restricted"];
const descriptions: Record<Level, string> = {
  Public: "Approved public material. Available to permitted local agents.",
  Internal: "For your workspace and permitted local agents.",
  Confidential: "Limited team access. Local agents only in this policy.",
  Restricted: "Named access only. Local agents only in this policy.",
};
const audienceOptions = [
  "Everyone in workspace",
  "Bell Engineering",
  "Server Platform",
  "Platform Software",
  "Thermal Engineering",
  "Product Reliability",
  "Firmware Security",
  "Sourcing Review",
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
function kind(name: string) {
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
    )[name.split(".").pop()?.toLowerCase() || ""] || "File"
  );
}
const TEXT_LIKE =
  /\.(md|markdown|txt|csv|tsv|json|yaml|yml|log|xml|html|js|ts|tsx|py|css|sql|sh|toml|ini|cfg|rst)$/i;
function textLike(item: DataItem) {
  return (
    /^(text\/|application\/(json|xml|x-yaml|yaml|javascript))/.test(item.type) ||
    TEXT_LIKE.test(item.name)
  );
}
const stateLabels: Record<DataItem["status"], string> = {
  received: "Received",
  extracting: "Extracting text…",
  indexing: "Indexing…",
  ready: "Indexed",
  failed: "Stored · not searchable",
  stale: "Stale · needs reindex",
};
function stateLabel(item: DataItem) {
  return item.status === "ready" && item.chunkCount
    ? `Indexed · ${item.chunkCount} ${item.chunkCount === 1 ? "chunk" : "chunks"}`
    : stateLabels[item.status];
}
function StateIcon({ item, size = 13 }: { item: DataItem; size?: number }) {
  return item.status === "ready" ? (
    <Check size={size} />
  ) : item.status === "failed" || item.status === "stale" ? (
    <Info size={size} />
  ) : (
    <span className="data-example-dot" />
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
  const { documents, members, collections: serverCollections } = useBuzz();
  const agentOptions = members.filter((m) => m.kind === "agent").map((m) => m.id);
  const items = useMemo<DataItem[]>(
    () => documents.map((doc) => ({ ...doc, kind: kind(doc.name) })),
    [documents],
  );
  const [localCollections, setLocalCollections] = useState<string[]>([]);
  const collections = useMemo(
    () => Array.from(new Set([...serverCollections, ...localCollections])),
    [serverCollections, localCollections],
  );
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
  const [importCollection, setImportCollection] = useState("Company");
  const [importAudiences, setImportAudiences] = useState<string[]>(["Everyone in workspace"]);
  const [importAgents, setImportAgents] = useState<string[]>([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string[]>([]);
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
  const [ask, setAsk] = useState("");
  const [asking, setAsking] = useState(false);
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [askError, setAskError] = useState("");
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
    let stopped = false;
    fetch(buzz.documentUrl(previewItem.id))
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((text) => {
        if (!stopped)
          setPreviewText(
            text.slice(0, 64000) +
              (text.length > 64000 ? "\n\n— Preview limited to the first 64 KB —" : ""),
          );
      })
      .catch(() => {
        if (!stopped) setPreviewText("This file could not be read. Download it to open it.");
      })
      .finally(() => {
        if (!stopped) setPreviewLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [previewItem]);
  const openPreview = (item: DataItem | null) => {
    setPreviewText("");
    setPreviewUrl("");
    setPreviewLoading(false);
    if (
      item &&
      (/^image\/(png|jpeg|webp|gif|avif)$/.test(item.type) || item.type === "application/pdf")
    ) {
      setPreviewUrl(buzz.documentUrl(item.id));
    } else if (item && textLike(item)) {
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
            `${item.name} ${item.owner} ${item.kind}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "size"
              ? b.size - a.size
              : b.updatedAt.localeCompare(a.updatedAt),
        ),
    [items, collection, levelFilter, query, sort],
  );
  const startImport = () => {
    setPendingFiles([]);
    setImportStatus([]);
    setImportError("");
    setImportCollection(
      collection === "All data" ? (collections[0] ?? "Company knowledge") : collection,
    );
    setImportOpen(true);
  };
  const receiveFiles = (files: FileList | File[] | null) => {
    if (!files?.length || importing) return;
    // Classification is selected in the import dialog before anything is sent.
    // Keep the current collection when a drop starts from a filtered collection.
    if (!importOpen)
      setImportCollection(
        collection === "All data" ? (collections[0] ?? "Company knowledge") : collection,
      );
    setPendingFiles(Array.from(files));
    setImportStatus([]);
    setImportError("");
    setImportOpen(true);
  };
  const changeImportLevel = (level: Level) => {
    setImportLevel(level);
    if (localOnly(level)) {
      setImportAgents((current) => current.filter((agent) => !agent.includes("cloud")));
      setImportAudiences((current) => current.filter((a) => a !== "Everyone in workspace"));
    }
  };
  const finishImport = async () => {
    if (!pendingFiles.length) {
      setImportError("Choose at least one file to add.");
      return;
    }
    setImporting(true);
    setImportError("");
    const status = pendingFiles.map(() => "Waiting…");
    let failed = 0;
    for (let i = 0; i < pendingFiles.length; i++) {
      status[i] = "Importing…";
      setImportStatus([...status]);
      try {
        const doc = await buzz.importDocument(pendingFiles[i], {
          collection: importCollection,
          level: importLevel,
          owner: "you",
          audiences: importAudiences,
          agents: importAgents,
        });
        status[i] = doc.status === "failed" ? doc.error || "Stored · not searchable" : doc.error || "Ready";
      } catch (error) {
        failed++;
        status[i] = error instanceof Error ? error.message : "Import failed.";
      }
      setImportStatus([...status]);
    }
    setImporting(false);
    const added = pendingFiles.length - failed;
    if (failed) {
      setImportError(`${failed} of ${pendingFiles.length} files could not be imported.`);
    } else {
      setImportOpen(false);
      setPendingFiles([]);
    }
    setCollection(importCollection);
    setLevelFilter("All classifications");
    setQuery("");
    notify(`${added} ${added === 1 ? "file added" : "files added"}.`);
  };
  async function changeLevel(item: DataItem, level: Level) {
    try {
      const response = await fetch('/api/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, level }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not move the document.');
      onNotify?.(`Moved to ${level}.`);
    } catch (error) { onNotify?.(error instanceof Error ? error.message : 'Could not move the document.'); }
  }
  const download = (item: DataItem) => {
    const anchor = document.createElement("a");
    anchor.href = buzz.documentUrl(item.id);
    anchor.download = item.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    notify("Download started.");
  };
  const remove = (item: DataItem) => {
    setSelectedId(null);
    buzz
      .deleteDocument(item.id)
      .then(() => notify("Source removed."))
      .catch((error: Error) => notify(error.message));
  };
  const askIndex = () => {
    const q = ask.trim();
    if (!q || asking) return;
    setAsking(true);
    setAskError("");
    buzz
      .retrieve(q, undefined, 6)
      .then((r) => setPassages(r.passages))
      .catch((error: Error) => {
        setPassages([]);
        setAskError(error.message);
      })
      .finally(() => setAsking(false));
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
    // ponytail: empty collections live client-side until a document uses one.
    setLocalCollections((current) => [...current, name]);
    setCollection(name);
    setCollectionOpen(false);
    setNewCollection("");
    notify(`Created ${name}.`);
  };

  return (
    <div
      className="page data-page quality-data"
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

      <section className="card data-ask" aria-label="Ask the index">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            askIndex();
          }}
        >
          <label className="data-search">
            <Search size={17} />
            <input
              value={ask}
              onChange={(event) => setAsk(event.target.value)}
              placeholder="Ask the index…"
              aria-label="Ask the index"
            />
            {ask && (
              <button
                type="button"
                aria-label="Clear question"
                onClick={() => {
                  setAsk("");
                  setPassages(null);
                  setAskError("");
                }}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <button type="submit" className="btn btn-secondary" disabled={asking || !ask.trim()}>
            {asking ? "Searching…" : "Retrieve"}
          </button>
        </form>
        {askError && (
          <p className="data-form-error" role="alert">
            {askError}
          </p>
        )}
        {passages && !askError && (
          <ol className="data-passages">
            {passages.length ? (
              passages.map((passage) => (
                <li key={passage.chunkId}>
                  <span>
                    <strong>
                      {passage.documentName} §{passage.idx + 1}
                    </strong>
                    <LevelBadge level={passage.level} />
                    <small>{passage.score.toFixed(2)}</small>
                  </span>
                  <p>{passage.text}</p>
                </li>
              ))
            ) : (
              <li className="muted">No passages matched.</li>
            )}
          </ol>
        )}
      </section>

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
          {layout === "layers" ? (
            <div className="data-security-layers" aria-label="Security layers">
              {levels
                .filter((level) => levelFilter === "All classifications" || levelFilter === level)
                .map((level) => {
                  const files = visible.filter((item) => item.level === level);
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
                          if (item && item.level !== level) void changeLevel(item, level);
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
                                <small>
                                  {bytes(item.size)} ·{" "}
                                  {item.status === "ready" ? "Searchable" : item.status}
                                </small>
                              </span>
                            </button>
                            <SelectField
                              className="data-layer-move"
                              aria-label={`Move ${item.name} to security layer`}
                              value={item.level}
                              onChange={(event) => changeLevel(item, event.target.value as Level)}
                            >
                              {levels.map((next) => (
                                <option key={next} value={next}>
                                  {next}
                                </option>
                              ))}
                            </SelectField>
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
                            Drop files here <span>or browse</span>
                          </button>
                        )}
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
                          <FileGlyph type={item.kind} />
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.kind} <span>·</span> {bytes(item.size)} <span>·</span>{" "}
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
                        <span
                          className={`data-file-state ${item.status === "ready" ? "available" : ""}`}
                          title={item.error || undefined}
                        >
                          <StateIcon item={item} />
                          {stateLabel(item)}
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
                    <FileGlyph type={item.kind} />
                    <LevelBadge level={item.level} />
                  </div>
                  <strong>{item.name}</strong>
                  <span>{item.collection}</span>
                  <div className="data-file-card-bottom">
                    <small>{bytes(item.size)}</small>
                    <small>{stateLabel(item)}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
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
              Stays in your workspace
            </span>
          </button>
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
          if (importing) return;
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
          <div className="field">
            <label className="field-label" htmlFor="data-import-collection">
              Collection
            </label>
            <SelectField
              id="data-import-collection"
              className="select"
              value={importCollection}
              disabled={importing}
              onChange={(event) => setImportCollection(event.target.value)}
            >
              {(collections.length ? collections : [importCollection]).map((name) => (
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
                    disabled={importing}
                    onChange={() => changeImportLevel(level)}
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
          <div className="data-detail-access">
            <fieldset>
              <legend>Audiences</legend>
              {audienceOptions.map((audience) => (
                <label className="data-checkbox-row" key={audience}>
                  <input
                    type="checkbox"
                    checked={importAudiences.includes(audience)}
                    disabled={
                      importing || (localOnly(importLevel) && audience === "Everyone in workspace")
                    }
                    onChange={(event) =>
                      setImportAudiences(
                        event.target.checked
                          ? [...importAudiences, audience]
                          : importAudiences.filter((a) => a !== audience),
                      )
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
                    checked={importAgents.includes(agent)}
                    disabled={importing || (localOnly(importLevel) && agent.includes("cloud"))}
                    onChange={(event) =>
                      setImportAgents(
                        event.target.checked
                          ? [...importAgents, agent]
                          : importAgents.filter((a) => a !== agent),
                      )
                    }
                  />
                  <span>{members.find((m) => m.id === agent)?.name ?? agent}</span>
                  {localOnly(importLevel) && agent.includes("cloud") && <LockKeyhole size={12} />}
                </label>
              ))}
            </fieldset>
          </div>
          <div className="data-picker-box">
            <UploadCloud size={23} />
            <strong>
              {pendingFiles.length
                ? `${pendingFiles.length} ${pendingFiles.length === 1 ? "file" : "files"} selected · ${bytes(pendingFiles.reduce((sum, file) => sum + file.size, 0))}`
                : "Select the files you want to add"}
            </strong>
            <div className="data-picker-actions">
              <button
                className="btn btn-secondary"
                disabled={importing}
                onClick={() => fileInput.current?.click()}
              >
                Choose files
              </button>
              <button
                className="btn btn-ghost"
                disabled={importing}
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
              {pendingFiles.slice(0, importStatus.length ? undefined : 5).map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <FileIcon size={14} />
                  <span>{file.webkitRelativePath || file.name}</span>
                  <small>{importStatus[index] ?? bytes(file.size)}</small>
                  {!importStatus.length && (
                    <button
                      className="icon-btn"
                      aria-label={`Remove ${file.name} from selection`}
                      onClick={() =>
                        setPendingFiles((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <X size={13} />
                    </button>
                  )}
                </li>
              ))}
              {!importStatus.length && pendingFiles.length > 5 && (
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
              className="btn btn-secondary"
              disabled={importing}
              onClick={() => {
                setImportOpen(false);
                setPendingFiles([]);
              }}
            >
              {importStatus.length && !importing ? "Done" : "Cancel"}
            </button>
            {!(importStatus.length && !importing) && (
              <button className="btn btn-primary" disabled={importing} onClick={finishImport}>
                <Plus size={16} />
                {importing ? "Importing…" : "Import"}
              </button>
            )}
          </DialogFooter>
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
                  <FileGlyph type={selected.kind} />
                  <div>
                    <DialogTitle>{selected.name}</DialogTitle>
                    <DialogDescription>
                      {selected.kind} · {bytes(selected.size)} · {selected.owner}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="data-detail-state">
                <span
                  className={`data-file-state ${selected.status === "ready" ? "available" : ""}`}
                >
                  <StateIcon item={selected} size={15} />
                  {stateLabel(selected)}
                </span>
                <span>
                  {selected.status === "ready"
                    ? `${selected.textChars.toLocaleString()} characters · stored locally`
                    : "Stored locally"}
                </span>
              </div>
              {selected.error && (
                <p className="data-form-error" role="alert">
                  {selected.error}
                </p>
              )}
              <div className="data-dialog-note">
                <Info size={15} />
                Classification changes retain the original source and its named access grants. Collection and audience changes require a new import.
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
                    disabled
                    onChange={() => {}}
                  >
                    <option>{selected.collection}</option>
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
                    onChange={event => changeLevel(selected, event.target.value as Level)}
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
                        disabled
                        readOnly
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
                        disabled
                        readOnly
                      />
                      <span>{members.find((m) => m.id === agent)?.name ?? agent}</span>
                      {localOnly(selected.level) && agent.includes("cloud") && (
                        <LockKeyhole size={12} />
                      )}
                    </label>
                  ))}
                </fieldset>
              </div>
              <div className="data-detail-footer">
                <button className="btn data-delete-button" onClick={() => remove(selected)}>
                  <Trash2 size={16} />
                  Remove
                </button>
                <div>
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
            <DialogDescription>Stored locally</DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="empty-state">Reading file…</div>
          ) : previewUrl ? (
            previewItem?.type === "application/pdf" ? (
              <iframe className="data-pdf-preview" src={previewUrl} title={previewItem.name} />
            ) : (
              <div className="data-image-preview">
                {/* Local blob URLs cannot use the remote image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={`Preview of ${previewItem?.name}`} />
              </div>
            )
          ) : previewText ||
            (previewItem &&
              (previewItem.type.startsWith("text/") ||
                /\.(md|txt|csv|json|yaml|yml|log|xml|html|js|ts|py|css|sql)$/i.test(
                  previewItem.name,
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
              Download
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
