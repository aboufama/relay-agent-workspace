import { SelectField } from "@/components/SelectField";
import {
  useAgentHomes,
  addPendingAgentHome,
  removePendingAgentHome,
} from '@/lib/agent-homes';
import { PageHeader } from '@/components/buzz/PageHeader';
import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Clock3,
  Cloud,
  Cpu,
  HardDrive,
  Info,
  Laptop,
  Plus,
  Server,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Device = {
  id: string;
  name: string;
  location: string;
  pending?: boolean;
  code?: string;
};
type Model = {
  name: string;
  family: string;
  size: number;
  tag: string;
  description: string;
};
const models: Model[] = [
  {
    name: 'Holo-3.1-35B-A3B',
    family: 'NVFP4 · Mixture of experts',
    size: 23.724,
    tag: 'Planning only',
    description:
      'Hcompany/Holo-3.1-35B-A3B-NVFP4 · approximately 24 GB of repository files. Download and runtime connection happen outside this interface.',
  },
];
export function ComputeView({
  onNotify,
}: {
  onNotify?: (message: string) => void;
}) {
  const homes = useAgentHomes();
  const devices: Device[] = homes
    .filter((home) => home.kind === 'local')
    .map((home) => ({
      id: home.id,
      name: home.name,
      location: home.location || 'Awaiting device verification',
      pending: home.status === 'pending',
    }));
  const [pairOpen, setPairOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [deviceDetail, setDeviceDetail] = useState<Device | null>(null);
  const [chosenModel, setChosenModel] = useState<Model | null>(null);
  const [target, setTarget] = useState('lab');
  const [speed, setSpeed] = useState(16);
  const [requests, setRequests] = useState<
    { model: string; device: string; size: number }[]
  >([]);
  const [filter, setFilter] = useState('all');
  const [cloudOpen, setCloudOpen] = useState(false);
  const [provider, setProvider] = useState('Anthropic');
  const [connectionName, setConnectionName] = useState('');
  const clouds = homes.filter((home) => home.kind === 'cloud');
  const estimate = (gb: number) => {
    const minutes = Math.ceil((gb * 1000) / Math.max(1, speed) / 60);
    return minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes} min`;
  };
  function pair() {
    if (!name.trim()) {
      setError('Give this device a name.');
      return;
    }
    if (!/^[a-zA-Z0-9-]{6,20}$/.test(code.trim())) {
      setError(
        'Enter a pairing code between 6 and 20 letters, numbers, or hyphens.',
      );
      return;
    }
    addPendingAgentHome({
      kind: 'local',
      name: name.trim(),
      location: 'Awaiting device verification',
    });
    setPairOpen(false);
    setName('');
    setCode('');
    setError('');
    onNotify?.(
      'Device pairing configuration saved for this session. Verification requires the device gateway.',
    );
  }
  function queue() {
    if (!chosenModel) return;
    const device = devices.find((d) => d.id === target);
    if (!device) return;
    if (
      requests.some(
        (r) => r.model === chosenModel.name && r.device === device.name,
      )
    ) {
      onNotify?.('This model is already in your installation plan.');
      setChosenModel(null);
      return;
    }
    setRequests([
      ...requests,
      { model: chosenModel.name, device: device.name, size: chosenModel.size },
    ]);
    setChosenModel(null);
    onNotify?.(
      'Added to installation plan. No download starts until a runtime is connected.',
    );
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
              setError('');
              setPairOpen(true);
            }}
          >
            <Plus size={17} /> Connect a GB10
          </button>
        }
      />

      <div className="agents-compute-heading">
        <div className="tabs" aria-label="Compute type">
          {[
            ['all', 'All compute'],
            ['local', 'Local devices'],
            ['cloud', 'Cloud providers'],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`tab ${filter === v ? 'active' : ''}`}
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="small muted">Preview · No live telemetry</span>
      </div>
      {filter !== 'cloud' && (
        <div className="agents-device-grid">
          {devices.map((device) => (
            <article className="card agents-device-card" key={device.id}>
              <div className="agents-device-top">
                <div className="agents-device-icon">
                  <Server size={23} />
                </div>
                <span
                  className={`badge ${device.pending ? 'badge-amber' : 'badge-muted'}`}
                >
                  {device.pending ? <Clock3 size={12} /> : <Laptop size={12} />}{' '}
                  {device.pending ? 'Pending verification' : 'Example device'}
                </span>
              </div>
              <h3>{device.name}</h3>
              <p className="muted small">{device.location}</p>
              <div className="agents-device-spec">
                <span>NVIDIA GB10</span>
                <span>128 GB unified</span>
              </div>
              <div className="agents-device-metrics">
                <div>
                  <span>Connection</span>
                  <strong>
                    {device.pending ? 'Pending' : 'Not connected'}
                  </strong>
                </div>
                <div>
                  <span>Model inventory</span>
                  <strong>Not synced</strong>
                </div>
                <div>
                  <span>GPU utilization</span>
                  <strong>—</strong>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setDeviceDetail(device)}
              >
                Device details <ArrowRight size={15} />
              </button>
            </article>
          ))}
          <button
            className="agents-add-device"
            onClick={() => {
              setError('');
              setPairOpen(true);
            }}
          >
            <span>
              <Plus size={24} />
            </span>
            <strong>Bring your own GB10</strong>
            <p>
              Pair a device with your workspace
              <br />
              and make it part of the team.
            </p>
            <small>
              Connect device <ArrowRight size={13} />
            </small>
          </button>
        </div>
      )}
      {filter !== 'local' && (
        <div className="card agents-cloud-panel">
          <div className="agents-cloud-panel-heading">
            <div className="agents-cloud-icon">
              <Cloud size={22} />
            </div>
            <div>
              <h3>Cloud connections</h3>
              <p>Extend your team with a hosted model provider.</p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setCloudOpen(true)}
            >
              <Plus size={15} /> Add provider
            </button>
          </div>
          {clouds.length > 0 && (
            <div className="agents-cloud-list">
              {clouds.map((c) => (
                <div key={c.id}>
                  <Cloud size={15} />
                  <strong>{c.name}</strong>
                  <span className="badge badge-amber">
                    {c.status === 'preview'
                      ? 'Example provider'
                      : 'Authentication required'}
                  </span>
                  {c.status === 'pending' && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => removePendingAgentHome(c.id)}
                    >
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
              Cloud agents use approved context. Confidential and restricted
              data stay local by the proposed workspace policy.
            </span>
          </div>
        </div>
      )}
      {filter !== 'cloud' && (
        <>
          <div className="agents-model-heading">
            <div>
              <div className="eyebrow">CHOOSE YOUR INTELLIGENCE</div>
              <h2>Model catalog</h2>
              <p className="muted small">
                Example model configurations for a single GB10. Verify current
                model packages and runtime support before installation.
              </p>
            </div>
            <label className="agents-speed-input">
              <Wifi size={15} />
              <span>Estimate at</span>
              <input
                aria-label="Download estimate speed in megabytes per second"
                type="number"
                min="1"
                max="10000"
                value={speed}
                onChange={(e) =>
                  setSpeed(
                    Math.min(10000, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
              />
              <span>MB/s</span>
            </label>
          </div>
          <div className="agents-model-grid">
            {models.map((model) => (
              <article className="card agents-model-card" key={model.name}>
                <div className="agents-model-card-top">
                  <div className="agents-model-symbol">Q</div>
                  <span className="badge badge-muted">{model.tag}</span>
                </div>
                <h3>{model.name}</h3>
                <span className="small muted">{model.family}</span>
                <p>{model.description}</p>
                <div className="agents-model-facts">
                  <span>
                    <HardDrive size={14} />
                    <strong>~{model.size} GB</strong>
                    <small>Package estimate</small>
                  </span>
                  <span>
                    <Clock3 size={14} />
                    <strong>~{estimate(model.size)}</strong>
                    <small>Transfer estimate</small>
                  </span>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setTarget(devices[0].id);
                    setChosenModel(model);
                  }}
                >
                  <ArrowDownToLine size={15} /> Plan installation
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {requests.length > 0 && (
        <section className="card agents-installation-plan">
          <div className="card-header">
            <h3>Installation plan</h3>
            <span className="badge badge-amber">
              {requests.length} awaiting connection
            </span>
          </div>
          {requests.map((r, i) => (
            <div className="agents-install-row" key={`${r.model}-${r.device}`}>
              <ArrowDownToLine size={17} />
              <div>
                <strong>{r.model}</strong>
                <span>
                  {r.device} · ~{r.size} GB
                </span>
              </div>
              <span className="badge badge-muted">Not started</span>
              <button
                className="btn btn-ghost"
                onClick={() => setRequests(requests.filter((_, j) => i !== j))}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      )}
      <div className="agents-bottom-note">
        <Info size={16} />
        <span>
          This is a configuration preview. Pairing and installation plans stay
          in this browser session; no device is contacted or model downloaded.
        </span>
      </div>
      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent className="agents-small-dialog">
          <DialogHeader>
            <div className="agents-dialog-icon">
              <Cpu size={23} />
            </div>
            <DialogTitle>Connect your GB10</DialogTitle>
            <DialogDescription>
              Your hardware becomes part of the workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="agents-pair-instructions">
            <div>
              <span>1</span>
              <p>Open the Relay device connector on your GB10.</p>
            </div>
            <div>
              <span>2</span>
              <p>Copy its one-time workspace pairing code.</p>
            </div>
            <div>
              <span>3</span>
              <p>Name your device and enter the code below.</p>
            </div>
          </div>
          <div className="agents-policy-note">
            <Info size={16} />
            <span>
              The device connector is an integration point in this preview.
              Saving creates a pending configuration only.
            </span>
          </div>
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
            <button
              className="btn btn-secondary"
              onClick={() => setPairOpen(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={pair}>
              Save pairing request <ArrowRight size={15} />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deviceDetail}
        onOpenChange={(open) => {
          if (!open) setDeviceDetail(null);
        }}
      >
        <DialogContent className="agents-small-dialog">
          <DialogHeader>
            <div className="agents-dialog-icon">
              <Server size={23} />
            </div>
            <DialogTitle>{deviceDetail?.name}</DialogTitle>
            <DialogDescription>{deviceDetail?.location}</DialogDescription>
          </DialogHeader>
          <dl className="agents-review-details">
            <div>
              <dt>Architecture</dt>
              <dd>NVIDIA GB10 · ARM64</dd>
            </div>
            <div>
              <dt>Memory configuration</dt>
              <dd>128 GB unified</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>
                {deviceDetail?.pending
                  ? 'Pending verification'
                  : 'Sample — not connected'}
              </dd>
            </div>
            <div>
              <dt>Telemetry</dt>
              <dd>Unavailable until connected</dd>
            </div>
            <div>
              <dt>Trust status</dt>
              <dd>Not verified</dd>
            </div>
          </dl>
          <div className="agents-policy-note">
            <ShieldCheck size={16} />
            <span>
              A live connection must verify device identity and workspace
              membership before accepting jobs or company data.
            </span>
          </div>
          <DialogFooter>
            <button
              className="btn btn-secondary"
              onClick={() => setDeviceDetail(null)}
            >
              Close
            </button>
            {deviceDetail?.pending && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  removePendingAgentHome(deviceDetail.id);
                  setDeviceDetail(null);
                  onNotify?.('Pending device removed.');
                }}
              >
                Remove request
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!chosenModel}
        onOpenChange={(open) => {
          if (!open) setChosenModel(null);
        }}
      >
        <DialogContent className="agents-small-dialog">
          <DialogHeader>
            <div className="agents-dialog-icon">
              <ArrowDownToLine size={23} />
            </div>
            <DialogTitle>Plan model installation</DialogTitle>
            <DialogDescription>
              {chosenModel?.name} · {chosenModel?.family}
            </DialogDescription>
          </DialogHeader>
          <label className="field">
            <span className="field-label">Target GB10</span>
            <SelectField
              className="select"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {devices.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                  {d.pending ? ' · Pending pairing' : ' · Example'}
                </option>
              ))}
            </SelectField>
          </label>
          <dl className="agents-review-details">
            <div>
              <dt>Estimated package</dt>
              <dd>~{chosenModel?.size} GB</dd>
            </div>
            <div>
              <dt>Estimated transfer</dt>
              <dd>
                ~{estimate(chosenModel?.size || 0)} at {speed} MB/s
              </dd>
            </div>
            <div>
              <dt>Additional memory</dt>
              <dd>Runtime and context overhead required</dd>
            </div>
          </dl>
          <div className="agents-policy-note">
            <Info size={16} />
            <span>
              This records an installation plan. A connected device will need to
              verify disk space, model compatibility, and the package checksum
              before downloading.
            </span>
          </div>
          <DialogFooter>
            <button
              className="btn btn-secondary"
              onClick={() => setChosenModel(null)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={queue}>
              <Check size={15} /> Add to plan
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
              Configure the connection now; authenticate securely when your
              backend is connected.
            </DialogDescription>
          </DialogHeader>
          <label className="field" htmlFor="compute-provider">
            <span className="field-label">Provider</span>
            <SelectField id="compute-provider"
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
          <div className="agents-policy-note">
            <ShieldCheck size={16} />
            <span>
              No API keys are collected here. Production credentials should be
              held in a server-side vault, scoped to the workspace.
            </span>
          </div>
          <DialogFooter>
            <button
              className="btn btn-secondary"
              onClick={() => setCloudOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                addPendingAgentHome({
                  kind: 'cloud',
                  provider,
                  name: `${provider}${connectionName.trim() ? ` · ${connectionName.trim()}` : ''}`,
                });
                setCloudOpen(false);
                setConnectionName('');
                onNotify?.(
                  'Provider configuration saved. Authentication is still required.',
                );
              }}
            >
              Save configuration
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
