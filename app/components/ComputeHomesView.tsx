'use client';

import { useId, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import './compute-homes.css';

export type ComputeHomeMetrics = {
  cpuPercent: number | null;
  gpuPercent: number | null;
  ramUsedBytes: number;
  ramTotalBytes: number;
  measuredAt: string;
};

export type ComputeHomesViewProps = {
  /** Existing agent grids/cards, including their create card. No duplicate editor. */
  localAgents: ReactNode;
  cloudAgents: ReactNode;
  localCount: number;
  cloudCount: number;
  /** Noninteractive avatar previews. Keep these small; typically the first four. */
  localPreview?: ReactNode;
  cloudPreview?: ReactNode;
  localStatus?: ReactNode;
  cloudStatus?: ReactNode;
  /** Setup/retry or other existing controls; rendered outside disclosure buttons. */
  localActions?: ReactNode;
  cloudActions?: ReactNode;
  /** Existing setup progress/error/logs surface, without its former page heading. */
  localSetup?: ReactNode;
  /** Caller should pass null when telemetry is unavailable or stale. */
  metrics?: ComputeHomeMetrics | null;
  className?: string;
};

function percent(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value)) : null;
}
function gigabytes(value: number) {
  return `${(value / 1e9).toFixed(1)} GB`;
}
function Meter({ label, value, detail }: { label: string; value: number | null; detail?: string }) {
  const id = useId();
  return <div className="compute-home-meter">
    <div className="compute-home-meter-label"><span id={id}>{label}</span><span>{detail ?? (value === null ? '—' : `${Math.round(value)}%`)}</span></div>
    {value === null
      ? <div className="compute-home-meter-unknown" aria-label={`${label} unavailable`} />
      : <progress aria-labelledby={id} value={value} max={100} />}
  </div>;
}

function ResourceMeters({ metrics }: { metrics: ComputeHomeMetrics | null }) {
  const hasRam = !!metrics && Number.isFinite(metrics.ramUsedBytes) && metrics.ramUsedBytes >= 0
    && Number.isFinite(metrics.ramTotalBytes) && metrics.ramTotalBytes > 0;
  const ramPercent = hasRam ? percent(metrics.ramUsedBytes / metrics.ramTotalBytes * 100) : null;
  return <div className="compute-home-resources" aria-label="Dell resource usage" title={metrics?.measuredAt ? `Measured ${metrics.measuredAt}` : 'Resource measurements unavailable'}>
    <Meter label="CPU" value={percent(metrics?.cpuPercent)} />
    <Meter label="GPU" value={percent(metrics?.gpuPercent)} />
    <Meter label="Memory" value={ramPercent} detail={hasRam ? `${gigabytes(metrics.ramUsedBytes)} / ${gigabytes(metrics.ramTotalBytes)}` : '—'} />
  </div>;
}

function Home({ name, kind, count, preview, status, actions, setup, children, metrics, defaultOpen }: {
  name: string;
  kind: 'local' | 'cloud';
  count: number;
  preview?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  setup?: ReactNode;
  children: ReactNode;
  metrics?: ComputeHomeMetrics | null;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return <section className={`compute-home compute-home-${kind}`} data-expanded={open} aria-labelledby={`${id}-name`}>
    <div className="compute-home-header">
      <button type="button" className="compute-home-disclosure" aria-expanded={open} aria-controls={`${id}-agents`} onClick={() => setOpen(current => !current)}>
        <span className="compute-home-art" aria-hidden="true">
          {kind === 'local'
            ? <Image src="/compute/dell-shoal.png" alt="" width={112} height={112} unoptimized />
            : <Image src="/compute/cloud-shoal.png" alt="" width={112} height={112} unoptimized />}
        </span>
        <span className="compute-home-identity">
          <span className="compute-home-name" id={`${id}-name`}>{name}</span>
          <span className="compute-home-occupants">
            {preview && <span className="compute-home-preview" aria-hidden="true">{preview}</span>}
            <span>{count} {count === 1 ? 'agent' : 'agents'}</span>
          </span>
        </span>
        <ChevronDown className="compute-home-chevron" size={18} aria-hidden="true" />
      </button>
      {(status || actions) && <div className="compute-home-connection">
        {status && <div className="compute-home-status">{status}</div>}
        {actions && <div className="compute-home-actions">{actions}</div>}
      </div>}
    </div>
    {kind === 'local' && <ResourceMeters metrics={metrics ?? null} />}
    <div id={`${id}-agents`} className="compute-home-interior" hidden={!open}>
      {setup && <div className="compute-home-setup">{setup}</div>}
      <div className="compute-home-agents">{children}</div>
    </div>
  </section>;
}

export function ComputeHomesView({
  localAgents, cloudAgents, localCount, cloudCount, localPreview, cloudPreview,
  localStatus, cloudStatus, localActions, cloudActions, localSetup, metrics = null, className = '',
}: ComputeHomesViewProps) {
  return <div className={`page compute-homes-page ${className}`}>
    <header className="compute-homes-heading"><h1>Habitats</h1></header>
    <div className="compute-homes-list">
      <Home name="Dell GB10" kind="local" count={localCount} preview={localPreview} status={localStatus} actions={localActions} setup={localSetup} metrics={metrics} defaultOpen>{localAgents}</Home>
      <Home name="Cloud" kind="cloud" count={cloudCount} preview={cloudPreview} status={cloudStatus} actions={cloudActions} defaultOpen={false}>{cloudAgents}</Home>
    </div>
  </div>;
}
