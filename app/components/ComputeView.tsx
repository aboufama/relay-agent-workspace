import { useAgentHomes, addPendingAgentHome, removePendingAgentHome } from "@/lib/agent-homes";
import { useBuzz } from "@/lib/buzz/store";
import type { NodeRecord } from "@/lib/buzz/types";
import { PageHeader } from "@/components/buzz/PageHeader";
import { useState } from "react";
import {
  ArrowRight,
  Clock3,
  Cloud,
  Cpu,
  Plus,
  Server,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectField } from "@/components/SelectField";

const list = (node: NodeRecord, key: "models" | "agents"): string[] => {
  const value = node.data[key];
  return Array.isArray(value) ? value.map(String) : [];
};
const healthy = (status: string) => status === "inference-healthy" || status === "accepting-work";
const seen = (iso: string) => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso : t.toLocaleString();
};

export function ComputeView({ onNotify }: { onNotify?: (message: string) => void }) {
  // useAgentHomes keeps the 30 s /api/runtime poll alive while this view is mounted; nodes land in the buzz store.
  const homes = useAgentHomes();
  const { nodes } = useBuzz();
  const pendingDevices = homes.filter((home) => home.kind === "local" && home.status === "pending");
  const inference = nodes.find((node) => node.kind === "inference");
  const models = inference ? list(inference, "models") : [];
  const [pairOpen, setPairOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [nodeDetail, setNodeDetail] = useState<NodeRecord | null>(null);
  const [filter, setFilter] = useState("all");
  const [cloudOpen, setCloudOpen] = useState(false);
  const [provider, setProvider] = useState("Anthropic");
  const [connectionName, setConnectionName] = useState("");
  const clouds = homes.filter((home) => home.kind === "cloud");
  function pair() {
    if (!name.trim()) {
      setError("Give this device a name.");
      return;
    }
    if (!/^[a-zA-Z0-9-]{6,20}$/.test(code.trim())) {
      setError("Enter a pairing code between 6 and 20 letters, numbers, or hyphens.");
      return;
    }
    addPendingAgentHome({
      kind: "local",
      name: name.trim(),
      location: "Not connected · pairing is not wired to the runtime yet",
    });
    setPairOpen(false);
    setName("");
    setCode("");
    setError("");
    onNotify?.("Device saved locally. It is not connected; nothing was installed.");
  }
  return (
    <div className="page agents-compute-page">
      <PageHeader
        className="page-heading"
        title="Compute"
        action={
          <button
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setPairOpen(true);
            }}
          >
            <Plus size={17} /> Add a device
          </button>
        }
      />

      <div className="agents-compute-heading">
        <div className="tabs" aria-label="Compute type">
          {[
            ["all", "All compute"],
            ["local", "Local devices"],
            ["cloud", "Cloud providers"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`tab ${filter === v ? "active" : ""}`}
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {filter !== "cloud" && (
        <div className="agents-device-grid">
          {nodes.map((node) => {
            const items = list(node, node.kind === "gateway" ? "agents" : "models");
            return (
              <article className="card agents-device-card" key={node.id}>
                <div className="agents-device-top">
                  <div className="agents-device-icon">
                    <Server size={23} />
                  </div>
                  <span className={`badge ${healthy(node.status) ? "badge-green" : node.status === "unreachable" ? "badge-red" : "badge-amber"}`}>
                    {node.status}
                  </span>
                </div>
                <h3>{node.name}</h3>
                <p className="muted small">{node.kind}</p>
                <div className="agents-device-spec">
                  <span>{node.kind === "gateway" ? "Agents" : "Models"}</span>
                  <span>{items.length ? items.join(", ") : "None reported"}</span>
                </div>
                <div className="agents-device-metrics">
                  <div>
                    <span>Status</span>
                    <strong>{node.status}</strong>
                  </div>
                  <div>
                    <span>{node.kind === "gateway" ? "Agents" : "Models"}</span>
                    <strong>{items.length}</strong>
                  </div>
                  <div>
                    <span>Last seen</span>
                    <strong>{seen(node.seenAt)}</strong>
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={() => setNodeDetail(node)}>
                  Node details <ArrowRight size={15} />
                </button>
              </article>
            );
          })}
          {pendingDevices.map((device) => (
            <article className="card agents-device-card" key={device.id}>
              <div className="agents-device-top">
                <div className="agents-device-icon">
                  <Server size={23} />
                </div>
                <span className="badge badge-amber">
                  <Clock3 size={12} /> Not connected
                </span>
              </div>
              <h3>{device.name}</h3>
              <p className="muted small">{device.location}</p>
              <button className="btn btn-secondary" onClick={() => { removePendingAgentHome(device.id); onNotify?.("Pending device removed."); }}>
                Remove request
              </button>
            </article>
          ))}
          {nodes.length === 0 && (
            <div className="empty-state">
              <h3>No nodes reported yet</h3>
              <p>Runtime health is polled every 30 seconds.</p>
            </div>
          )}
          <button
            className="agents-add-device"
            onClick={() => {
              setError("");
              setPairOpen(true);
            }}
          >
            <span>
              <Plus size={24} />
            </span>
            <strong>Add a device</strong>
            <p>
              Save a device request.
              <br />
              Pairing is not connected to the runtime yet.
            </p>
            <small>
              Add device <ArrowRight size={13} />
            </small>
          </button>
        </div>
      )}
      {filter !== "local" && (
        <div className="card agents-cloud-panel">
          <div className="agents-cloud-panel-heading">
            <div className="agents-cloud-icon">
              <Cloud size={22} />
            </div>
            <div>
              <h3>Cloud connections</h3>
              <p>Extend your team with a hosted model provider. Not connected yet.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setCloudOpen(true)}>
              <Plus size={15} /> Add provider
            </button>
          </div>
          {clouds.length > 0 && (
            <div className="agents-cloud-list">
              {clouds.map((c) => (
                <div key={c.id}>
                  <Cloud size={15} />
                  <strong>{c.name}</strong>
                  <span className="badge badge-amber">Not connected</span>
                  {c.status === "pending" && (
                    <button className="btn btn-ghost" onClick={() => removePendingAgentHome(c.id)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="agents-cloud-policy">
            <ShieldCheck size={15} />
            <span>
              Cloud agents use approved context. Confidential and restricted data stay local by the
              proposed workspace policy.
            </span>
          </div>
        </div>
      )}
      {filter !== "cloud" && (
        <>
          <div className="agents-model-heading">
            <div>
              <div className="eyebrow">SERVED MODELS</div>
              <h2>Models</h2>
            </div>
            <span className="muted small">
              {inference ? `${inference.name} · ${inference.status}` : "No inference node reported"}
            </span>
          </div>
          <div className="agents-model-grid">
            {models.map((model) => (
              <article className="card agents-model-card" key={model}>
                <div className="agents-model-card-top">
                  <div className="agents-model-symbol">{model.slice(0, 1).toUpperCase()}</div>
                  <span className={`badge ${inference && healthy(inference.status) ? "badge-green" : "badge-amber"}`}>
                    {inference?.status}
                  </span>
                </div>
                <h3>{model}</h3>
                <span className="small muted">Reported by {inference?.name}</span>
              </article>
            ))}
            {inference && models.length === 0 && (
              <div className="empty-state">
                <h3>No models reported</h3>
                <p>The inference node reported no loaded models.</p>
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent className="agents-small-dialog">
          <DialogHeader>
            <div className="agents-dialog-icon">
              <Cpu size={23} />
            </div>
            <DialogTitle>Add a device</DialogTitle>
            <DialogDescription>
              Saves a request only. Pairing is not connected to the runtime; nothing is installed.
            </DialogDescription>
          </DialogHeader>
          <label className="field">
            <span className="field-label">Device name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering GB10"
              maxLength={50}
            />
          </label>
          <label className="field">
            <span className="field-label">Pairing code</span>
            <input
              className="input agents-pairing-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GB10-XXXX"
              maxLength={20}
            />
          </label>
          {error && (
            <p role="alert" className="agents-form-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <button className="btn btn-secondary" onClick={() => setPairOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={pair}>
              Save request <ArrowRight size={15} />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!nodeDetail}
        onOpenChange={(open) => {
          if (!open) setNodeDetail(null);
        }}
      >
        <DialogContent className="agents-small-dialog">
          <DialogHeader>
            <div className="agents-dialog-icon">
              <Server size={23} />
            </div>
            <DialogTitle>{nodeDetail?.name}</DialogTitle>
            <DialogDescription>{nodeDetail?.kind}</DialogDescription>
          </DialogHeader>
          {nodeDetail && (
            <dl className="agents-review-details">
              <div>
                <dt>Status</dt>
                <dd>{nodeDetail.status}</dd>
              </div>
              <div>
                <dt>Models</dt>
                <dd>{list(nodeDetail, "models").join(", ") || "None reported"}</dd>
              </div>
              <div>
                <dt>Agents</dt>
                <dd>{list(nodeDetail, "agents").join(", ") || "None reported"}</dd>
              </div>
              {typeof nodeDetail.data.url === "string" && (
                <div>
                  <dt>URL</dt>
                  <dd>{nodeDetail.data.url}</dd>
                </div>
              )}
              <div>
                <dt>Last seen</dt>
                <dd>{seen(nodeDetail.seenAt)}</dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <button className="btn btn-secondary" onClick={() => setNodeDetail(null)}>
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={cloudOpen} onOpenChange={setCloudOpen}>
        <DialogContent className="agents-small-dialog">
          <DialogHeader>
            <div className="agents-dialog-icon agents-cloud-icon">
              <Cloud size={23} />
            </div>
            <DialogTitle>Add a cloud provider</DialogTitle>
            <DialogDescription>
              Saves a label only. Provider authentication is not connected yet.
            </DialogDescription>
          </DialogHeader>
          <label className="field" htmlFor="compute-provider">
            <span className="field-label">Provider</span>
            <SelectField
              id="compute-provider"
              className="select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option>Anthropic</option>
              <option>OpenAI</option>
              <option>Google</option>
              <option>Custom OpenAI-compatible provider</option>
            </SelectField>
          </label>
          <label className="field">
            <span className="field-label">Connection label</span>
            <input
              className="input"
              placeholder="e.g. Company research account"
              value={connectionName}
              maxLength={70}
              onChange={(e) => setConnectionName(e.target.value)}
            />
          </label>

          <DialogFooter>
            <button className="btn btn-secondary" onClick={() => setCloudOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                addPendingAgentHome({
                  kind: "cloud",
                  provider,
                  name: `${provider}${connectionName.trim() ? ` · ${connectionName.trim()}` : ""}`,
                });
                setCloudOpen(false);
                setConnectionName("");
                onNotify?.("Provider label saved. Not connected; authentication is not wired yet.");
              }}
            >
              Save label
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
