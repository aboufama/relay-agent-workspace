import { bellProjects } from "@/lib/bell-projects";
import { SelectField } from "@/components/SelectField";
import { PageHeader } from "@/components/buzz/PageHeader";
import { buzz, useBuzz } from "@/lib/buzz/store";
import type { Packet, RunMode, RunRecord, TaskRecord } from "@/lib/buzz/types";
import { useState, type SyntheticEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  LayoutGrid,
  List,
  MessageSquare,
  Play,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statuses = ["Backlog", "In progress", "Blocked", "In review", "Done"];
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
const runBadge = (status: RunRecord["status"]) =>
  status === "completed" ? "badge-green" : status === "failed" || status === "cancelled" ? "badge-red" : "badge-amber";

export function ProjectsView({ onNotify, onNavigate }: { onNotify?: (message: string) => void; onNavigate?: (view: string) => void }) {
  const { projects, tasks, members, runs, loaded } = useBuzz();
  const agents = members.filter((m) => m.kind === "agent");
  const agentNames = new Set(agents.map((m) => m.name));
  const isAgent = (name: string) => agentNames.has(name);
  const [projectId, setProjectId] = useState("summit-r8");
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("Everyone");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [owner, setOwner] = useState("Orion");
  const [status, setStatus] = useState("Backlog");
  const [priority, setPriority] = useState("Medium");
  const [comment, setComment] = useState("");
  const [runAgent, setRunAgent] = useState("");
  const [runMode, setRunMode] = useState<RunMode>("deep");
  const [runError, setRunError] = useState("");
  const [packet, setPacket] = useState<{ runId: string; packet: Packet | null } | null>(null);
  const project = projects.find((item) => item.id === projectId) ?? projects[0];
  const allTasks = tasks.filter((task) => task.project === project?.id);
  const filtered = tasks.filter(
        (task) =>
          task.project === project?.id &&
          `${task.title} ${task.id} ${task.label}`.toLowerCase().includes(search.toLowerCase()) &&
          (ownerFilter === "Everyone" ||
            (ownerFilter === "Agents" ? agentNames.has(task.owner) : !agentNames.has(task.owner))),
      );
  const brief = bellProjects.find(item => item.id === project?.id);
  const selected = tasks.find((task) => task.id === selectedId);
  const selectedRuns = runs
    .filter((r) => r.taskId === selectedId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const completed = allTasks.filter((task) => task.status === "Done").length;
  const fail = (err: Error) => onNotify?.(err.message);
  function updateTask(id: string, changes: Partial<TaskRecord> & { comment?: string }) {
    buzz.updateTask(id, changes).catch(fail);
  }
  function openCreate(nextStatus = "Backlog") {
    setStatus(nextStatus);
    setCreateOpen(true);
  }
  function createTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !project) return;
    buzz
      .createTask({
        project: project.id,
        title: title.trim(),
        description: description.trim(),
        status,
        owner,
        priority,
        label: isAgent(owner) ? "Agent task" : "Team task",
        criteria: criteria.trim() || null,
      })
      .then(() => {
        setCreateOpen(false);
        setTitle("");
        setDescription("");
        setCriteria("");
        onNotify?.("Task added.");
      })
      .catch(fail);
  }
  function postComment(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    updateTask(selected.id, { comment: comment.trim() });
    setComment("");
  }
  function startRun() {
    if (!selected) return;
    const agentId = runAgent || agents[0]?.id;
    if (!agentId) return;
    setRunError("");
    buzz
      .startRun(selected.id, agentId, runMode)
      .then(() => onNotify?.("Run queued."))
      .catch((err: Error) => setRunError(err.message));
  }
  function inspect(run: RunRecord) {
    if (packet?.runId === run.id) {
      setPacket(null);
      return;
    }
    buzz
      .inspectRun(run.id)
      .then((r) => setPacket({ runId: run.id, packet: r.run.packet ?? null }))
      .catch(fail);
  }
  function openTask(id: string) {
    setSelectedId(id);
    setRunAgent(agents.find(agent => agent.name === tasks.find(task => task.id === id)?.owner)?.id || "");
    setComment("");
    setRunError("");
    setPacket(null);
  }

  if (!project) {
    return (
      <div className="page work-page work-projects-page">
        <PageHeader className="page-heading" title="Projects" />
        <div className="empty-state">
          <h3>{loaded ? "No projects yet" : "Loading projects…"}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="page work-page work-projects-page">
      <PageHeader className="page-heading" title="Projects" />
      <div className="work-project-selector">
        {projects.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setProjectId(item.id);
              setSearch("");
            }}
            className={`work-project-chip ${project.id === item.id ? "active" : ""}`}
          >
            <span className={`work-project-marker work-marker-${item.color}`} />
            <span>{item.name}</span>
            <span className="work-count">
              {tasks.filter((task) => task.project === item.id).length}
            </span>
          </button>
        ))}
      </div>
      <section className="work-project-heading">
        <div>
          <div className="work-project-title">
            <span className={`work-symbol work-symbol-${project.color}`}>
              <FolderKanban size={23} />
            </span>
            <h2>{project.name}</h2>
            <span className="badge badge-blue">{allTasks.length - completed} open</span>
          </div>
          <p>{project.description}</p>
        </div>
        <div className="work-project-progress">
          <div>
            <span>
              {completed} of {allTasks.length} completed
            </span>
            <strong>
              {allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0}%
            </strong>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${allTasks.length ? (completed / allTasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </section>
      {brief && <section className="bell-project-brief" aria-label="Program brief">
        <div><span className="bell-eyebrow">Program objective</span><p>{brief.goal}</p>
          <div className="bell-program-agents">{brief.agentIds.map(id => {
            const agent = agents.find(item => item.id === id);
            return agent && <button className="btn btn-secondary" key={id} onClick={() => { onNavigate?.('compute'); window.dispatchEvent(new CustomEvent('relay:open-agent', { detail: { agentId: id } })); }}>
              {agent.name}<span className="muted">{String(agent.data.role || '')}</span>
            </button>;
          })}</div>
        </div>
        <div><span className="bell-eyebrow">Next decision</span><h3>{brief.nextGate}</h3>
          <p className="bell-gate-owner">Decision owner: {members.find(member => member.id === brief.ownerId)?.name}</p>
          <p className="bell-project-risk">{brief.risk}</p>
          <span className="badge badge-amber">{brief.status} · demo scenario</span>
        </div>
      </section>}
      <div className="work-board-toolbar">
        <div className="work-view-switch">
          <button
            aria-pressed={view === "board"}
            className={view === "board" ? "active" : ""}
            onClick={() => setView("board")}
          >
            <LayoutGrid size={16} />
            Board
          </button>
          <button
            aria-pressed={view === "list"}
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <List size={17} />
            List
          </button>
        </div>
        <label className="work-search">
          <Search size={16} />
          <input
            aria-label="Search project tasks"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <SelectField
          className="select"
          aria-label="Filter task assignees"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
        >
          <option>Everyone</option>
          <option>People</option>
          <option>Agents</option>
        </SelectField>
        <button className="btn btn-primary" onClick={() => openCreate()}>
          <Plus size={16} />
          New task
        </button>
      </div>
      {view === "board" ? (
        <div className="work-board">
          {statuses.map((column) => (
            <section className="work-board-column" key={column}>
              <div className="work-column-heading">
                <span
                  className={`work-column-dot work-status-${column.toLowerCase().replaceAll(" ", "-")}`}
                />
                <h3>{column}</h3>
                <span className="work-count">
                  {filtered.filter((task) => task.status === column).length}
                </span>
                <button
                  className="icon-btn"
                  aria-label={`Add task to ${column}`}
                  onClick={() => openCreate(column)}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="work-column-cards">
                {filtered
                  .filter((task) => task.status === column)
                  .map((task) => (
                    <button
                      className="work-task-card"
                      key={task.id}
                      onClick={() => openTask(task.id)}
                    >
                      <span className="work-task-meta">
                        <span>{task.id}</span>
                        <span
                          className={`work-priority work-priority-${task.priority.toLowerCase()}`}
                        >
                          {task.priority}
                        </span>
                      </span>
                      <strong>{task.title}</strong>
                      <span
                        className={`work-task-label ${isAgent(task.owner) ? "work-label-agent" : ""}`}
                      >
                        {isAgent(task.owner) && <Sparkles size={12} />}
                        {task.label}
                      </span>
                      {task.deliverable && (
                        <span className="work-task-deliverable">
                          <FileText size={13} />
                          Deliverable ready to review
                        </span>
                      )}
                      <span className="work-task-footer">
                        <span>
                          <CalendarDays size={13} />
                          {task.due || "No due date"}
                        </span>
                        <span
                          className={`avatar ${isAgent(task.owner) ? "avatar-agent" : ""}`}
                          title={task.owner || "Unassigned"}
                        >
                          {initials(task.owner || "Unassigned")}
                        </span>
                      </span>
                    </button>
                  ))}
                <button className="work-add-task" onClick={() => openCreate(column)}>
                  <Plus size={15} />
                  Add task
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table work-task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id}>
                  <td aria-label={task.title}>
                    <button
                      aria-label={`Open task: ${task.title}`}
                      className="work-table-task"
                      onClick={() => openTask(task.id)}
                    >
                      <span>{task.id}</span>
                      <strong>{task.title}</strong>
                    </button>
                  </td>
                  <td>
                    <SelectField
                      className="work-inline-select"
                      aria-label={`Status of ${task.title}`}
                      value={task.status}
                      onChange={(e) => updateTask(task.id, { status: e.target.value })}
                    >
                      {statuses.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </SelectField>
                  </td>
                  <td>
                    <span className="work-assignee">
                      <span className={`avatar ${isAgent(task.owner) ? "avatar-agent" : ""}`}>
                        {initials(task.owner || "Unassigned")}
                      </span>
                      {task.owner || "Unassigned"}
                    </span>
                  </td>
                  <td>
                    <span className={`work-priority work-priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="muted">{task.due || "No due date"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <h3>No tasks found</h3>
              <p>Add a task or adjust your filters.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="work-dialog">
          <DialogHeader>
            <DialogTitle>Create a task</DialogTitle>
            <DialogDescription>Add an outcome to {project.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createTask} className="work-form">
            <label className="field">
              <span className="field-label">Task title</span>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={140}
                placeholder="What needs to happen?"
              />
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                className="textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context and what a good outcome looks like…"
              />
            </label>
            <label className="field">
              <span className="field-label">Acceptance criteria</span>
              <textarea
                className="textarea"
                rows={2}
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                placeholder="How will we know this is done?"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Assign to</span>
                <SelectField
                  className="select"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  {members.map((item) => (
                    <option key={item.id}>{item.name}</option>
                  ))}
                </SelectField>
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <SelectField
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {statuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </SelectField>
              </label>
              <label className="field" htmlFor="new-task-priority">
                <span className="field-label">Priority</span>
                <SelectField
                  id="new-task-priority"
                  className="select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </SelectField>
              </label>
            </div>

            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create task
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="work-dialog work-dialog-wide">
          {selected && (
            <>
              <DialogHeader>
                <span className="eyebrow">
                  {selected.id} · {project.name}
                </span>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.description || "No description added yet."}
                </DialogDescription>
              </DialogHeader>
              <div className="work-task-properties">
                <label>
                  <span>Status</span>
                  <SelectField
                    className="select"
                    value={selected.status}
                    onChange={(e) => updateTask(selected.id, { status: e.target.value })}
                  >
                    {statuses.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </SelectField>
                </label>
                <label>
                  <span>Assignee</span>
                  <SelectField
                    className="select"
                    value={selected.owner}
                    onChange={(e) => updateTask(selected.id, { owner: e.target.value })}
                  >
                    {!members.some((m) => m.name === selected.owner) && (
                      <option value={selected.owner}>{selected.owner || "Unassigned"}</option>
                    )}
                    {members.map((item) => (
                      <option key={item.id}>{item.name}</option>
                    ))}
                  </SelectField>
                </label>
                <label htmlFor="task-detail-priority">
                  <span>Priority</span>
                  <SelectField
                    id="task-detail-priority"
                    className="select"
                    value={selected.priority}
                    onChange={(e) => updateTask(selected.id, { priority: e.target.value })}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </SelectField>
                </label>
              </div>
              {selected.criteria && (
                <div className="work-draft">
                  <div className="work-draft-label">
                    <CheckCircle2 size={15} /> ACCEPTANCE CRITERIA
                  </div>
                  <p>{selected.criteria}</p>
                </div>
              )}
              {selected.deliverable && (
                <div className="work-draft">
                  <div className="work-draft-label">
                    <FileText size={15} /> DELIVERABLE
                  </div>
                  <p>{selected.deliverable}</p>
                </div>
              )}
              <div className="work-draft">
                <div className="work-draft-label">
                  <Sparkles size={15} /> RUNS <span className="work-count">{selectedRuns.length}</span>
                </div>
                <div className="work-task-properties">
                  <label>
                    <span>Run with agent</span>
                    <SelectField
                      className="select"
                      value={runAgent || agents[0]?.id || ""}
                      onChange={(e) => setRunAgent(e.target.value)}
                    >
                      {agents.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <div>
                    <span>Mode</span>
                    <SelectField className="select" aria-label="Task mode" value={runMode} onChange={(event) => setRunMode(event.target.value as RunMode)}>
                      <option value="quick">Quick</option><option value="deep">Deep</option>
                    </SelectField>
                  </div>
                  <div>
                    <span>&nbsp;</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!agents.length}
                      onClick={startRun}
                    >
                      <Play size={15} /> Run with agent
                    </button>
                  </div>
                </div>
                {runError && (
                  <p role="alert" className="agents-form-error">
                    {runError}
                  </p>
                )}
                {selectedRuns.map((run) => (
                  <div className="work-comment" key={run.id}>
                    <span className={`badge ${runBadge(run.status)}`}>{run.status}</span>
                    <div>
                      <strong>
                        {members.find((m) => m.id === run.agentId)?.name ?? run.agentId}
                        {run.mode ? ` · ${run.mode === "deep" ? "Deep" : "Quick"}` : ""}
                        {run.model ? ` · ${run.model}` : ""}
                        {run.inputTokens != null || run.outputTokens != null
                          ? ` · ${run.inputTokens ?? 0} in / ${run.outputTokens ?? 0} out`
                          : ""}
                      </strong>
                      <p className="muted small">
                        {new Date(run.createdAt).toLocaleString()}
                        {run.status === "failed" && run.error ? ` · ${run.error}` : ""}
                      </p>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => inspect(run)}
                      >
                        {packet?.runId === run.id ? "Hide context" : "View context"}
                      </button>
                      {packet?.runId === run.id &&
                        (packet.packet ? (
                          <dl className="agents-review-details">
                            <div>
                              <dt>Tokens</dt>
                              <dd>
                                {packet.packet.estimatedTokens} of {packet.packet.budgetTokens}
                              </dd>
                            </div>
                            <div>
                              <dt>Evidence</dt>
                              <dd>
                                {packet.packet.evidence.length
                                  ? packet.packet.evidence
                                      .map((p) => `${p.documentName} §${p.idx + 1}`)
                                      .join(", ")
                                  : "None"}
                                {packet.packet.droppedEvidence
                                  ? ` · ${packet.packet.droppedEvidence} dropped`
                                  : ""}
                              </dd>
                            </div>
                            <div>
                              <dt>History</dt>
                              <dd>
                                {packet.packet.historyMessages} messages
                                {packet.packet.droppedHistory
                                  ? ` · ${packet.packet.droppedHistory} dropped`
                                  : ""}
                              </dd>
                            </div>
                            <div>
                              <dt>Rules</dt>
                              <dd>{packet.packet.rulesVersion}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="muted small">No context packet recorded for this run.</p>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="work-comments">
                <h3>
                  <MessageSquare size={17} />
                  Activity <span className="work-count">{selected.comments.length}</span>
                </h3>
                {selected.comments.length ? (
                  selected.comments.map((item, index) => (
                    <div className="work-comment" key={index}>
                      <span className="avatar">
                        <MessageSquare size={13} />
                      </span>
                      <div>
                        <strong>Update {index + 1}</strong>
                        <p>{item}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted small">No updates yet. Start the conversation.</p>
                )}
                <form onSubmit={postComment} className="work-comment-compose">
                  <input
                    className="input"
                    aria-label="Add a task comment"
                    placeholder="Add an update…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!comment.trim()}>
                    <ArrowRight size={17} />
                    <span className="sr-only">Post comment</span>
                  </button>
                </form>
              </div>
              <div className="dialog-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedId(null)}>
                  Close
                </button>
                {selected.status !== "Done" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      updateTask(selected.id, { status: "Done" });
                      onNotify?.("Task marked complete.");
                    }}
                  >
                    <CheckCircle2 size={16} />
                    Mark complete
                  </button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
