import { SelectField } from "@/components/SelectField";
import { PageHeader } from "@/components/buzz/PageHeader";
import { useMemo, useState, type SyntheticEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  LayoutGrid,
  List,
  MessageSquare,
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

type Status = "Backlog" | "In progress" | "In review" | "Done";
type Project = { id: string; name: string; description: string; color: string };
type Task = {
  id: string;
  project: string;
  title: string;
  description: string;
  status: Status;
  owner: string;
  priority: string;
  due: string;
  label: string;
  comments: string[];
  deliverable?: string;
};
const statuses: Status[] = ["Backlog", "In progress", "In review", "Done"];
const initialProjects: Project[] = [
  {
    id: "launch",
    name: "Acme customer launch",
    description: "Everything we need to give Acme a great first day.",
    color: "blue",
  },
  {
    id: "platform",
    name: "Platform reliability",
    description: "A calmer, more reliable foundation for our customers.",
    color: "violet",
  },
  {
    id: "people",
    name: "Team onboarding",
    description: "Help new teammates do their best work, sooner.",
    color: "green",
  },
];
const initialTasks: Task[] = [
  {
    id: "MRD-108",
    project: "launch",
    title: "Confirm the customer handoff call",
    description:
      "Coordinate the final handoff with Acme’s operations lead and share the confirmed time in #customer-launches.",
    status: "Backlog",
    owner: "Maya Chen",
    priority: "High",
    due: "Sep 16",
    label: "Operations",
    comments: ["Engineering is available Monday morning."],
  },
  {
    id: "MRD-109",
    project: "launch",
    title: "Prepare customer onboarding guide",
    description:
      "Bring the product walkthrough, support channels, and launch checklist into one concise guide.",
    status: "In progress",
    owner: "Nova",
    priority: "Medium",
    due: "Sep 15",
    label: "Customer success",
    comments: [],
  },
  {
    id: "MRD-110",
    project: "launch",
    title: "Review production readiness",
    description:
      "Review the launch checks with engineering. Call out any open dependency and its owner.",
    status: "In progress",
    owner: "Alex Morgan",
    priority: "High",
    due: "Sep 15",
    label: "Engineering",
    comments: ["The final integration test is scheduled for this afternoon."],
  },
  {
    id: "MRD-111",
    project: "launch",
    title: "Draft the launch readiness brief",
    description:
      "Summarize launch readiness across Engineering, Operations, and Customer Success for Maya to review.",
    status: "In review",
    owner: "Atlas",
    priority: "Medium",
    due: "Sep 16",
    label: "Agent task",
    comments: ["Atlas has prepared a first draft for review."],
    deliverable:
      "Acme launch readiness\n\nEngineering: production checklist completed.\nOperations: onboarding coverage confirmed.\nCustomer success: launch owner assigned.\n\nOpen decision: confirm the customer handoff call before Friday afternoon.",
  },
  {
    id: "MRD-112",
    project: "launch",
    title: "Create the shared customer workspace",
    description: "Set up the internal launch channel and add the project team.",
    status: "Done",
    owner: "Jordan Lee",
    priority: "Low",
    due: "Sep 12",
    label: "Operations",
    comments: [],
  },
  {
    id: "MRD-113",
    project: "launch",
    title: "Gather account context",
    description: "Collect the customer goals, signed scope, and notes from the discovery call.",
    status: "Done",
    owner: "Atlas",
    priority: "Medium",
    due: "Sep 12",
    label: "Agent task",
    comments: [],
    deliverable:
      "Customer goal: reduce manual onboarding work.\nPrimary team: Operations.\nLaunch scope: workspace setup, shared knowledge, and an initial onboarding workflow.",
  },
  {
    id: "MRD-201",
    project: "platform",
    title: "Audit retry behavior in agent jobs",
    description: "Document how jobs recover from interrupted inference.",
    status: "In progress",
    owner: "Scout",
    priority: "High",
    due: "Sep 18",
    label: "Engineering",
    comments: [],
  },
  {
    id: "MRD-202",
    project: "platform",
    title: "Define incident handoff checklist",
    description: "A clear handoff when an on-call shift ends.",
    status: "Backlog",
    owner: "Alex Morgan",
    priority: "Medium",
    due: "Sep 20",
    label: "Operations",
    comments: [],
  },
  {
    id: "MRD-301",
    project: "people",
    title: "Update the first-week checklist",
    description: "Make the first week welcoming and easy to navigate.",
    status: "In review",
    owner: "Nova",
    priority: "Medium",
    due: "Sep 17",
    label: "People",
    comments: [],
  },
];
const isAgent = (name: string) => ["Atlas", "Nova", "Scout"].includes(name);
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

export function ProjectsView({ onNotify }: { onNotify?: (message: string) => void }) {
  const [projects, setProjects] = useState(initialProjects);
  const [projectId, setProjectId] = useState("launch");
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("Everyone");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("You");
  const [status, setStatus] = useState<Status>("Backlog");
  const [priority, setPriority] = useState("Medium");
  const [comment, setComment] = useState("");
  const project = projects.find((item) => item.id === projectId)!;
  const allTasks = tasks.filter((task) => task.project === projectId);
  const filtered = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.project === projectId &&
          `${task.title} ${task.id} ${task.label}`.toLowerCase().includes(search.toLowerCase()) &&
          (ownerFilter === "Everyone" ||
            (ownerFilter === "Agents" ? isAgent(task.owner) : !isAgent(task.owner))),
      ),
    [tasks, projectId, search, ownerFilter],
  );
  const selected = tasks.find((task) => task.id === selectedId);
  const completed = allTasks.filter((task) => task.status === "Done").length;
  function updateTask(id: string, changes: Partial<Task>) {
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, ...changes } : task)));
  }
  function openCreate(nextStatus: Status = "Backlog") {
    setStatus(nextStatus);
    setCreateOpen(true);
  }
  function createTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setTasks((items) => [
      ...items,
      {
        id: `MRD-${Date.now().toString().slice(-6)}`,
        project: projectId,
        title: title.trim(),
        description: description.trim(),
        status,
        owner,
        priority,
        due: "No due date",
        label: isAgent(owner) ? "Agent task" : "Team task",
        comments: [],
      },
    ]);
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    onNotify?.("Task added.");
  }
  function addProject(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProject.trim()) return;
    const id = crypto.randomUUID();
    setProjects((items) => [
      ...items,
      {
        id,
        name: newProject.trim(),
        description: projectDescription.trim() || "A shared place to move work forward.",
        color: "blue",
      },
    ]);
    setProjectId(id);
    setNewProject("");
    setProjectDescription("");
    setProjectOpen(false);
    setSearch("");
    onNotify?.("Project created.");
  }
  function postComment(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    updateTask(selected.id, { comments: [...selected.comments, comment.trim()] });
    setComment("");
  }

  return (
    <div className="page work-page work-projects-page">
      <PageHeader
        className="page-heading"
        title="Projects"
        action={
          <button className="btn btn-secondary" onClick={() => setProjectOpen(true)}>
            <Plus size={17} />
            New project
          </button>
        }
      />
      <div className="work-project-selector">
        {projects.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setProjectId(item.id);
              setSearch("");
            }}
            className={`work-project-chip ${projectId === item.id ? "active" : ""}`}
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
            <span className="badge badge-blue">In progress</span>
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
                      onClick={() => {
                        setSelectedId(task.id);
                        setComment("");
                      }}
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
                          Draft ready to review
                        </span>
                      )}
                      <span className="work-task-footer">
                        <span>
                          <CalendarDays size={13} />
                          {task.due}
                        </span>
                        <span
                          className={`avatar ${isAgent(task.owner) ? "avatar-agent" : ""}`}
                          title={task.owner}
                        >
                          {initials(task.owner)}
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
                      onClick={() => {
                        setSelectedId(task.id);
                        setComment("");
                      }}
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
                      onChange={(e) => updateTask(task.id, { status: e.target.value as Status })}
                    >
                      {statuses.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </SelectField>
                  </td>
                  <td>
                    <span className="work-assignee">
                      <span className={`avatar ${isAgent(task.owner) ? "avatar-agent" : ""}`}>
                        {initials(task.owner)}
                      </span>
                      {task.owner}
                    </span>
                  </td>
                  <td>
                    <span className={`work-priority work-priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="muted">{task.due}</td>
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
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Assign to</span>
                <SelectField
                  className="select"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  {["You", "Maya Chen", "Alex Morgan", "Jordan Lee", "Atlas", "Scout", "Nova"].map(
                    (item) => (
                      <option key={item}>{item}</option>
                    ),
                  )}
                </SelectField>
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <SelectField
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
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
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="work-dialog">
          <DialogHeader>
            <DialogTitle>Create a project</DialogTitle>
            <DialogDescription>Give a shared outcome a home.</DialogDescription>
          </DialogHeader>
          <form className="work-form" onSubmit={addProject}>
            <label className="field">
              <span className="field-label">Project name</span>
              <input
                className="input"
                required
                maxLength={80}
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="e.g. Fall product launch"
              />
            </label>
            <label className="field">
              <span className="field-label">Outcome</span>
              <textarea
                className="textarea"
                rows={3}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="What are we working toward?"
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProjectOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create project
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
                    onChange={(e) => updateTask(selected.id, { status: e.target.value as Status })}
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
                    {[
                      "You",
                      "Maya Chen",
                      "Alex Morgan",
                      "Jordan Lee",
                      "Atlas",
                      "Scout",
                      "Nova",
                    ].map((item) => (
                      <option key={item}>{item}</option>
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
              {selected.deliverable && (
                <div className="work-draft">
                  <div className="work-draft-label">
                    <FileText size={15} /> DELIVERABLE
                  </div>
                  <p>{selected.deliverable}</p>
                </div>
              )}
              <div className="work-comments">
                <h3>
                  <MessageSquare size={17} />
                  Activity <span className="work-count">{selected.comments.length}</span>
                </h3>
                {selected.comments.length ? (
                  selected.comments.map((item, index) => (
                    <div className="work-comment" key={index}>
                      <span className="avatar">{index === 0 ? "MC" : "YO"}</span>
                      <div>
                        <strong>
                          {index === 0 && selected.id.startsWith("MRD-1")
                            ? "Project team"
                            : "Workspace member"}
                        </strong>
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
