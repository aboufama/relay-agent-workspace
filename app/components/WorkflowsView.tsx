import { SelectField } from "@/components/SelectField";
import { PageHeader } from "@/components/buzz/PageHeader";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { buzz, useBuzz } from "@/lib/buzz/store";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  agent: string;
  active: boolean;
  steps: string[];
  owner: string;
  color: string;
  approval: boolean;
};
// Automation definitions have no backend yet: local UI state only, nothing executes.
const initialWorkflows: Workflow[] = [
  {
    "id": "bell-wf-1",
    "name": "Compass pilot readiness",
    "description": "Review recovery and security attestations before the 250-system pilot.",
    "trigger": "Release owner requests a gate review",
    "agent": "Atlas",
    "active": false,
    "steps": [
      "Retrieve scoped firmware evidence",
      "List unmet criteria and owners",
      "Draft a sanitized gate summary",
      "Request Olivia\u2019s promotion approval"
    ],
    "owner": "Olivia Chen",
    "color": "blue",
    "approval": true
  },
  {
    "id": "bell-wf-2",
    "name": "Horizon thermal decision",
    "description": "Compare fan curves against power, skin temperature, and acoustic limits.",
    "trigger": "A new chamber result is imported",
    "agent": "Nova",
    "active": false,
    "steps": [
      "Read Thermal & Power Lab results",
      "Compare every acceptance limit",
      "Propose the next measured run",
      "Request Marcus\u2019s qualification review"
    ],
    "owner": "Marcus Reed",
    "color": "violet",
    "approval": true
  },
  {
    "id": "bell-wf-3",
    "name": "Cedar sourcing review",
    "description": "Separate qualified launch supply from conditional cost scenarios.",
    "trigger": "Qualification or allocation evidence changes",
    "agent": "Ledger",
    "active": false,
    "steps": [
      "Read restricted supplier scenarios",
      "Check qualified system coverage",
      "Draft an Internal summary without prices",
      "Request Orion\u2019s sourcing approval"
    ],
    "owner": "Orion",
    "color": "green",
    "approval": true
  },
  {
    "id": "bell-wf-4",
    "name": "Weekly engineering readout",
    "description": "Bring approved Internal milestones and blockers into one brief.",
    "trigger": "Friday engineering review",
    "agent": "Sage",
    "active": false,
    "steps": [
      "Read Engineering Release Office",
      "Group blockers by decision owner",
      "Prepare a source-linked readout",
      "Request Olivia\u2019s review"
    ],
    "owner": "Olivia Chen",
    "color": "amber",
    "approval": true
  }
];
const prettyAction = (action: string) => {
  try {
    return JSON.stringify(JSON.parse(action), null, 2);
  } catch {
    return action;
  }
};

export function WorkflowsView({ onNotify, reviewRequest }: { onNotify?: (message: string) => void; reviewRequest?: { id: string; version: number } | null }) {
  const { approvals, members } = useBuzz();
  const agents = members.filter((m) => m.kind === "agent");
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [tab, setTab] = useState<"workflows" | "approvals">("workflows");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All workflows");
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [decideError, setDecideError] = useState("");
  useEffect(() => {
    if (!reviewRequest) return;
    queueMicrotask(() => { setTab("approvals"); setApprovalId(reviewRequest.id); setDecideError(""); });
  }, [reviewRequest]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("When an agent is mentioned");
  const [agent, setAgent] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const approval = approvals.find((a) => a.id === approvalId) ?? null;
  const pending = approvals.filter((a) => a.status === "Pending").length;
  const visible = useMemo(
    () =>
      workflows.filter(
        (w) =>
          (w.name + w.description)
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (filter === 'All workflows' ||
            (filter === 'Active' ? w.active : !w.active)),
      ),
    [workflows, search, filter],
  );
  function toggleWorkflow(workflow: Workflow) {
    const next = { ...workflow, active: !workflow.active };
    setWorkflows((items) =>
      items.map((item) => (item.id === workflow.id ? next : item)),
    );
    if (selected?.id === workflow.id) setSelected(next);
    onNotify?.(`${workflow.name} ${next.active ? 'enabled' : 'paused'}`);
  }
  function createWorkflow(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || 'A custom workflow for your team.',
      trigger,
      agent: agent || agents[0]?.name || "",
      active: false,
      steps: [
        'Gather permitted context',
        'Prepare a response',
        ...(needsApproval ? ['Request owner approval'] : []),
        'Prepare channel draft',
      ],
      owner: "You",
      color: "blue",
      approval: needsApproval,
    };
    setWorkflows((items) => [workflow, ...items]);
    setCreateOpen(false);
    setName("");
    setDescription("");
    onNotify?.("Automation saved (preview only; nothing runs yet).");
  }
  function decide(status: 'Approved' | 'Rejected') {
    if (!approval) return;
    setDecideError("");
    // The decision is bound to the exact action reviewed; the API rejects (409) if it changed.
    buzz
      .decide(approval.id, status, approval.action)
      .then(() => onNotify?.(`Draft ${status.toLowerCase()}.`))
      .catch((err: Error) => setDecideError(err.message));
  }

  return (
    <div className="page work-page quality-workflows">
      <PageHeader
        className="page-heading"
        title="Workflows"
        action={
          <button
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={17} /> Create workflow
          </button>
        }
      />

      <div className="work-tabbar">
        <fieldset className="tabs" aria-label="Workflow sections">
          <button
            className={`tab ${tab === 'workflows' ? 'active' : ''}`}
            aria-pressed={tab === 'workflows'}
            onClick={() => setTab('workflows')}
          >
            Automations (preview) <span className="work-count">{workflows.length}</span>
          </button>
          <button
            className={`tab ${tab === 'approvals' ? 'active' : ''}`}
            aria-pressed={tab === 'approvals'}
            onClick={() => setTab('approvals')}
          >
            Needs approval{' '}
            <span className="work-count work-count-amber">{pending}</span>
          </button>
        </fieldset>
      </div>
      {tab === 'workflows' ? (
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
                    className={`work-toggle ${workflow.active ? 'is-on' : ''}`}
                    role="switch"
                    aria-checked={workflow.active}
                    aria-label={`${workflow.active ? 'Pause' : 'Enable'} ${workflow.name}`}
                    onClick={() => toggleWorkflow(workflow)}
                  >
                    <span />
                  </button>
                </div>
                <button className="work-card-title" onClick={() => setSelected(workflow)}>
                  {workflow.name}
                  <ArrowUpRight size={17} />
                </button>
                <p className="work-flow-description">{workflow.description}</p>
                <div className="work-trigger">
                  <Zap size={14} />
                  <span>{workflow.trigger}</span>
                </div>
                <div className="work-mini-flow">
                  <span className="avatar avatar-agent">
                    {workflow.agent.slice(0, 1)}
                  </span>
                  <span>{workflow.agent}</span>
                  <ChevronRight size={14} />
                  <span className="work-step-pill">
                    {workflow.steps.length} steps
                  </span>
                  {workflow.approval && (
                    <span title="Includes human approval">
                      <ShieldCheck size={16} />
                    </span>
                  )}
                </div>
                <div className="work-flow-footer">
                  <span>
                    <span
                      className={`status-dot ${workflow.active ? 'work-dot-green' : 'work-dot-muted'}`}
                    />
                    {workflow.active ? "Enabled (preview)" : "Paused"}
                  </span>
                  <button className="btn btn-ghost" onClick={() => setSelected(workflow)}>
                    View steps <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {visible.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>No matching workflows</h3>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('');
                  setFilter('All workflows');
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
              <h2>Approvals</h2>
            </div>
            <span className="badge badge-amber">{pending} awaiting review</span>
          </div>
          {approvals.length === 0 && (
            <p className="muted small">No approval requests yet.</p>
          )}
          {approvals.map((item) => (
            <button
              key={item.id}
              className="work-approval-row"
              onClick={() => {
                setDecideError("");
                setApprovalId(item.id);
              }}
            >
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
                className={`badge ${item.status === 'Pending' ? 'badge-amber' : item.status === 'Approved' ? 'badge-green' : 'badge-red'}`}
              >
                {item.status === 'Pending' ? 'Needs review' : item.status}
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="work-dialog quality-work-dialog">
          <DialogHeader>
            <DialogTitle>Create a workflow</DialogTitle>
            <DialogDescription className="sr-only">
              Workflow configuration
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
                  {agents.map((item) => (
                    <option key={item.id}>{item.name}</option>
                  ))}
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
                <small>
                  Pause for review before preparing the final action.
                </small>
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
        <DialogContent className="work-dialog work-dialog-wide quality-work-dialog">
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
                  <div className="work-step" key={`${step}-${index}`}>
                    <span className="work-step-number">{index + 1}</span>
                    <div>
                      <strong>{step}</strong>
                      <p>
                        {step.toLowerCase().includes('approval')
                          ? 'An authorized person reviews the exact proposed action.'
                          : index === 0
                            ? 'Use only the context available to the assigned agent.'
                            : index === selected.steps.length - 1
                              ? 'Prepare the result for the destination channel.'
                              : 'Create a draft that can be inspected before continuing.'}
                      </p>
                    </div>
                    {step.toLowerCase().includes('approval') ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <ChevronRight size={17} />
                    )}
                  </div>
                ))}
              </div>
              <p className="muted small">
                Preview only. Automations are not executed by the backend yet.
              </p>

              <div className="dialog-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => toggleWorkflow(selected)}
                >
                  {selected.active ? <Pause size={16} /> : <Play size={16} />}
                  {selected.active ? 'Pause' : 'Enable'}
                </button>
                <button className="btn btn-primary" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!approval}
        onOpenChange={(open) => {
          if (!open) setApprovalId(null);
        }}
      >
        <DialogContent className="work-dialog work-dialog-wide quality-work-dialog">
          {approval && (
            <>
              <DialogHeader>
                <DialogTitle>{approval.title}</DialogTitle>
                <DialogDescription>
                  {approval.agent} is requesting review before sharing with{' '}
                  {approval.recipient}.
                </DialogDescription>
              </DialogHeader>
              <div className="work-detail-meta">
                <span>
                  <LockKeyhole size={15} />
                  {approval.level}
                </span>
                <span
                  className={`badge ${approval.status === 'Pending' ? 'badge-amber' : approval.status === 'Approved' ? 'badge-green' : 'badge-red'}`}
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
              <div className="work-draft">
                <div className="work-draft-label">
                  <ShieldCheck size={15} /> EXACT PROPOSED ACTION
                </div>
                <p>
                  <code>{prettyAction(approval.action)}</code>
                </p>
              </div>
              {approval.status !== "Pending" && (
                <p className="muted small">
                  {approval.status} by {approval.decidedBy || "unknown"}
                  {approval.decidedAt ? ` · ${new Date(approval.decidedAt).toLocaleString()}` : ""}
                </p>
              )}
              {decideError && (
                <p role="alert" className="agents-form-error">
                  {decideError}
                </p>
              )}

              <div className="dialog-actions">
                {approval.status === 'Pending' ? (
                  <>
                    <button
                      className="btn btn-secondary work-reject"
                      onClick={() => decide('Rejected')}
                    >
                      <X size={16} />
                      Reject draft
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => decide('Approved')}
                    >
                      <Check size={16} />
                      Approve draft
                    </button>
                  </>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setApprovalId(null)}>
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
