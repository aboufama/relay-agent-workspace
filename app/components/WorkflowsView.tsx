import { SelectField } from "@/components/SelectField";
import { PageHeader } from "@/components/buzz/PageHeader";
import { useMemo, useState, type SyntheticEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  GitBranch,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  agent: string;
  active: boolean;
  steps: string[];
  runs: number;
  owner: string;
  color: string;
  approval: boolean;
};
type Approval = {
  id: string;
  title: string;
  agent: string;
  workflow: string;
  body: string;
  recipient: string;
  status: "Pending" | "Approved" | "Rejected";
  level: string;
};
const initialWorkflows: Workflow[] = [
  {
    id: "wf-1",
    name: "Customer launch briefing",
    description: "Bring every team into the loop before a customer goes live.",
    trigger: "New launch in #customer-launches",
    agent: "Atlas",
    active: true,
    steps: [
      "Collect launch context",
      "Draft a readiness brief",
      "Request owner approval",
      "Share in channel",
    ],
    runs: 24,
    owner: "Maya Chen",
    color: "blue",
    approval: true,
  },
  {
    id: "wf-2",
    name: "Weekly engineering pulse",
    description: "A considered summary of shipped work, blockers, and what’s next.",
    trigger: "Every Monday at 9:00 AM",
    agent: "Scout",
    active: true,
    steps: ["Read engineering updates", "Summarize progress", "Prepare channel draft"],
    runs: 12,
    owner: "Alex Morgan",
    color: "violet",
    approval: false,
  },
  {
    id: "wf-3",
    name: "New teammate onboarding",
    description: "A warm welcome with the right context from day one.",
    trigger: "New workspace member",
    agent: "Nova",
    active: false,
    steps: [
      "Find team handbook",
      "Prepare welcome plan",
      "Request manager approval",
      "Create onboarding tasks",
    ],
    runs: 8,
    owner: "Jordan Lee",
    color: "green",
    approval: true,
  },
  {
    id: "wf-4",
    name: "Sensitive document review",
    description: "Make sure restricted knowledge reaches the right people.",
    trigger: "Document added to Restricted",
    agent: "Atlas",
    active: true,
    steps: ["Read document metadata", "Suggest access policy", "Request security approval"],
    runs: 18,
    owner: "Maya Chen",
    color: "amber",
    approval: true,
  },
];
const initialApprovals: Approval[] = [
  {
    id: "ap-1",
    title: "Acme launch readiness brief",
    agent: "Atlas",
    workflow: "Customer launch briefing",
    recipient: "#customer-launches",
    status: "Pending",
    level: "Internal",
    body: "Acme is ready for the Monday launch. Engineering has completed the production checklist and Operations has confirmed onboarding coverage.\n\nOne item needs attention: the customer success owner should confirm the handoff call before 3:00 PM Friday.\n\nNext step: Maya to confirm the customer update and publish the launch brief.",
  },
  {
    id: "ap-2",
    title: "Welcome plan for Sam Rivera",
    agent: "Nova",
    workflow: "New teammate onboarding",
    recipient: "#people-ops",
    status: "Pending",
    level: "Confidential",
    body: "Welcome, Sam! Your first week is focused on meeting the team and understanding how we work.\n\nMonday: workspace orientation and a conversation with your manager.\nTuesday: product walkthrough and customer context.\nWednesday–Friday: pair with the Operations team on your first small project.\n\nYour manager will confirm calendar invitations before this plan is shared.",
  },
];

export function WorkflowsView({ onNotify }: { onNotify?: (message: string) => void }) {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [tab, setTab] = useState<"workflows" | "approvals">("workflows");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All workflows");
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [previewStep, setPreviewStep] = useState(-1);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("When an agent is mentioned");
  const [agent, setAgent] = useState("Atlas");
  const [needsApproval, setNeedsApproval] = useState(true);
  const pending = approvals.filter((a) => a.status === "Pending").length;
  const visible = useMemo(
    () =>
      workflows.filter(
        (w) =>
          (w.name + w.description).toLowerCase().includes(search.toLowerCase()) &&
          (filter === "All workflows" || (filter === "Active" ? w.active : !w.active)),
      ),
    [workflows, search, filter],
  );
  function toggleWorkflow(workflow: Workflow) {
    const next = { ...workflow, active: !workflow.active };
    setWorkflows((items) => items.map((item) => (item.id === workflow.id ? next : item)));
    if (selected?.id === workflow.id) setSelected(next);
    onNotify?.(`${workflow.name} ${next.active ? "enabled" : "paused"}`);
  }
  function createWorkflow(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || "A custom workflow for your team.",
      trigger,
      agent,
      active: false,
      steps: [
        "Gather permitted context",
        "Prepare a response",
        ...(needsApproval ? ["Request owner approval"] : []),
        "Prepare channel draft",
      ],
      runs: 0,
      owner: "You",
      color: "blue",
      approval: needsApproval,
    };
    setWorkflows((items) => [workflow, ...items]);
    setCreateOpen(false);
    setName("");
    setDescription("");
    setPreviewStep(-1);
    onNotify?.("Workflow created.");
  }
  function decide(status: "Approved" | "Rejected") {
    if (!approval) return;
    const next = { ...approval, status };
    setApprovals((items) => items.map((item) => (item.id === next.id ? next : item)));
    setApproval(next);
    onNotify?.(`Draft ${status.toLowerCase()}.`);
  }

  return (
    <div className="page work-page">
      <PageHeader
        className="page-heading"
        title="Workflows"
        action={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={17} /> Create workflow
          </button>
        }
      />

      <div className="work-tabbar">
        <div className="tabs">
          <button
            className={`tab ${tab === "workflows" ? "active" : ""}`}
            onClick={() => setTab("workflows")}
          >
            All workflows <span className="work-count">{workflows.length}</span>
          </button>
          <button
            className={`tab ${tab === "approvals" ? "active" : ""}`}
            onClick={() => setTab("approvals")}
          >
            Needs approval <span className="work-count work-count-amber">{pending}</span>
          </button>
        </div>
        <span className="muted small">
          <ShieldCheck size={14} /> Human oversight, built in
        </span>
      </div>
      {tab === "workflows" ? (
        <>
          <div className="toolbar work-toolbar">
            <label className="work-search">
              <Search size={17} />
              <input
                aria-label="Search workflows"
                placeholder="Search workflows…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <SelectField
              aria-label="Workflow status"
              className="select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All workflows</option>
              <option>Active</option>
              <option>Paused</option>
            </SelectField>
          </div>
          <div className="work-flow-grid">
            {visible.map((workflow) => (
              <article className="work-flow-card" key={workflow.id}>
                <div className="work-flow-card-top">
                  <span className={`work-symbol work-symbol-${workflow.color}`}>
                    <GitBranch size={21} />
                  </span>
                  <button
                    className={`work-toggle ${workflow.active ? "is-on" : ""}`}
                    role="switch"
                    aria-checked={workflow.active}
                    aria-label={`${workflow.active ? "Pause" : "Enable"} ${workflow.name}`}
                    onClick={() => toggleWorkflow(workflow)}
                  >
                    <span />
                  </button>
                </div>
                <button
                  className="work-card-title"
                  onClick={() => {
                    setSelected(workflow);
                    setPreviewStep(-1);
                  }}
                >
                  {workflow.name}
                  <ArrowUpRight size={17} />
                </button>
                <p className="work-flow-description">{workflow.description}</p>
                <div className="work-trigger">
                  <Zap size={14} />
                  <span>{workflow.trigger}</span>
                </div>
                <div className="work-mini-flow">
                  <span className="avatar avatar-agent">{workflow.agent.slice(0, 1)}</span>
                  <span>{workflow.agent}</span>
                  <ChevronRight size={14} />
                  <span className="work-step-pill">{workflow.steps.length} steps</span>
                  {workflow.approval && (
                    <span title="Includes human approval">
                      <ShieldCheck size={16} />
                    </span>
                  )}
                </div>
                <div className="work-flow-footer">
                  <span>
                    <span
                      className={`status-dot ${workflow.active ? "work-dot-green" : "work-dot-muted"}`}
                    />
                    {workflow.active ? "Enabled" : "Paused"}
                  </span>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setSelected(workflow);
                      setPreviewStep(-1);
                    }}
                  >
                    View workflow <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {visible.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>No matching workflows</h3>
              <p>Try another search or create a workflow for your team.</p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearch("");
                  setFilter("All workflows");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="work-approval-panel">
          <div className="work-panel-heading">
            <div>
              <h2>A moment of human judgment</h2>
              <p className="muted">Review the exact draft before an agent takes the next step.</p>
            </div>
            <span className="badge badge-amber">{pending} awaiting review</span>
          </div>
          {approvals.map((item) => (
            <button key={item.id} className="work-approval-row" onClick={() => setApproval(item)}>
              <span className="work-approval-icon">
                <FileText size={21} />
              </span>
              <span className="work-approval-info">
                <strong>{item.title}</strong>
                <span>
                  {item.agent} · {item.workflow}
                </span>
              </span>
              <span
                className={`badge ${item.status === "Pending" ? "badge-amber" : item.status === "Approved" ? "badge-green" : "badge-red"}`}
              >
                {item.status === "Pending" ? "Needs review" : item.status}
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="work-dialog">
          <DialogHeader>
            <DialogTitle>Create a workflow</DialogTitle>
            <DialogDescription>
              Start with a clear outcome. You can walk through each step before connecting a
              service.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createWorkflow} className="work-form">
            <label className="field">
              <span className="field-label">Workflow name</span>
              <input
                className="input"
                required
                maxLength={90}
                placeholder="e.g. Daily customer health check"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">What should it accomplish?</span>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Describe the outcome for your team…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label className="field" htmlFor="workflow-trigger">
                <span className="field-label">Trigger</span>
                <SelectField
                  id="workflow-trigger"
                  className="select"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                >
                  <option>When an agent is mentioned</option>
                  <option>Document added to Data</option>
                  <option>Every weekday at 9:00 AM</option>
                  <option>New workspace member</option>
                  <option>Manual start</option>
                </SelectField>
              </label>
              <label className="field" htmlFor="workflow-agent">
                <span className="field-label">Assigned agent</span>
                <SelectField
                  id="workflow-agent"
                  className="select"
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                >
                  <option>Atlas</option>
                  <option>Scout</option>
                  <option>Nova</option>
                </SelectField>
              </label>
            </div>
            <label className="work-checkbox">
              <input
                type="checkbox"
                checked={needsApproval}
                onChange={(e) => setNeedsApproval(e.target.checked)}
              />
              <span>
                <strong>Include human approval</strong>
                <small>Pause for review before preparing the final action.</small>
              </span>
              <ShieldCheck size={19} />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create workflow <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="work-dialog work-dialog-wide">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <div className="work-detail-meta">
                <span>
                  <Zap size={15} />
                  {selected.trigger}
                </span>
                <span>
                  <Sparkles size={15} />
                  {selected.agent}
                </span>
              </div>
              <div className="work-step-list">
                {selected.steps.map((step, index) => (
                  <div
                    className={`work-step ${previewStep >= index ? "work-step-done" : ""}`}
                    key={`${step}-${index}`}
                  >
                    <span className="work-step-number">
                      {previewStep >= index ? <Check size={16} /> : index + 1}
                    </span>
                    <div>
                      <strong>{step}</strong>
                      <p>
                        {step.toLowerCase().includes("approval")
                          ? "An authorized person reviews the exact proposed action."
                          : index === 0
                            ? "Use only the context available to the assigned agent."
                            : index === selected.steps.length - 1
                              ? "Prepare the result for the destination channel."
                              : "Create a draft that can be inspected before continuing."}
                      </p>
                    </div>
                    {step.toLowerCase().includes("approval") ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <ChevronRight size={17} />
                    )}
                  </div>
                ))}
              </div>
              {previewStep === selected.steps.length - 1 && (
                <div className="work-inline-success">
                  <CheckCircle2 size={18} />
                  <span>End of steps.</span>
                </div>
              )}

              <div className="dialog-actions">
                <button className="btn btn-secondary" onClick={() => toggleWorkflow(selected)}>
                  {selected.active ? <Pause size={16} /> : <Play size={16} />}
                  {selected.active ? "Pause" : "Enable"}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    setPreviewStep((current) =>
                      current >= selected.steps.length - 1 ? -1 : current + 1,
                    )
                  }
                >
                  {previewStep >= selected.steps.length - 1
                    ? "Reset steps"
                    : previewStep < 0
                      ? "View first step"
                      : "View next step"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!approval}
        onOpenChange={(open) => {
          if (!open) setApproval(null);
        }}
      >
        <DialogContent className="work-dialog work-dialog-wide">
          {approval && (
            <>
              <DialogHeader>
                <DialogTitle>{approval.title}</DialogTitle>
                <DialogDescription>
                  {approval.agent} is requesting review before sharing with {approval.recipient}.
                </DialogDescription>
              </DialogHeader>
              <div className="work-detail-meta">
                <span>
                  <LockKeyhole size={15} />
                  {approval.level}
                </span>
                <span
                  className={`badge ${approval.status === "Pending" ? "badge-amber" : approval.status === "Approved" ? "badge-green" : "badge-red"}`}
                >
                  {approval.status}
                </span>
              </div>
              <div className="work-draft">
                <div className="work-draft-label">
                  <FileText size={15} /> PROPOSED MESSAGE
                </div>
                <p>{approval.body}</p>
              </div>

              <div className="dialog-actions">
                {approval.status === "Pending" ? (
                  <>
                    <button
                      className="btn btn-secondary work-reject"
                      onClick={() => decide("Rejected")}
                    >
                      <X size={16} />
                      Reject draft
                    </button>
                    <button className="btn btn-primary" onClick={() => decide("Approved")}>
                      <Check size={16} />
                      Approve draft
                    </button>
                  </>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setApproval(null)}>
                    Done
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
