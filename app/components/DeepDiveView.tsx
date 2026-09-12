"use client";
import "./deep-dive.css";
import { useState } from "react";
import { ArrowLeft, Plus, Play, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/buzz/PageHeader";
import { SelectField } from "@/components/SelectField";
import { buzz, refresh, useBuzz } from "@/lib/buzz/store";
import type { TaskRecord } from "@/lib/buzz/types";

const examples = [
  { title: "Cedar: qualified supply versus lower cost", project: "cedar-power", agent: "ledger", prompt: "Compare qualified PSU-A launch coverage with a conditional PSU-B allocation for 4,000 Summit R8 systems. Cite sourcing and qualification evidence, identify the owner decision, and keep the output Restricted." },
  { title: "Horizon 14: resolve the thermal tradeoff", project: "horizon-14", agent: "nova", prompt: "Compare fan curves A and B against sustained power, skin temperature, junction temperature, and acoustics. Propose the smallest next lab run; do not invent curve C measurements." },
  { title: "Summit R8: public evaluation criteria", project: "summit-r8", agent: "scout", prompt: "Prepare a public-safe checklist for Summit R8 serviceability and Cedar redundant power. Use only Public Product Reference and identify which claims remain design targets." },
];
const activeStatuses = new Set(['queued', 'preparing', 'running', 'awaiting']);

export function DeepDiveView() {
  const { tasks, projects, members, runs, loaded } = useBuzz();
  const agents = members.filter(member => member.kind === 'agent');
  const requests = tasks.filter(task => task.label === 'Research');
  const [editing, setEditing] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [prompt, setPrompt] = useState('');
  const [projectId, setProjectId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const selectedRuns = runs.filter(run => run.taskId === editing).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestRun = selectedRuns[0];
  const active = selectedRuns.some(run => activeStatuses.has(run.status));

  function open(task?: TaskRecord) {
    setEditing(task?.id || 'new');
    setTopic(task?.title || '');
    setPrompt(task?.description || '');
    setProjectId(task?.project || projects[0]?.id || '');
    setAgentId(agents.find(agent => agent.name === task?.owner)?.id || agents[0]?.id || '');
    setNotice(''); setError('');
  }
  async function saveTask() {
    const agent = agents.find(item => item.id === agentId);
    if (!prompt.trim() || !projectId || !agent) throw new Error('Choose a project and agent, and describe the research question.');
    const values = { title: topic.trim() || prompt.trim().split('\n')[0].slice(0, 100), description: prompt.trim(), project: projectId, owner: agent.name, label: 'Research' };
    if (editing && editing !== 'new') { await buzz.updateTask(editing, values); return editing; }
    const task = await buzz.createTask({ ...values, status: 'Backlog', priority: 'Medium', criteria: 'Answer the research question with source references. Separate observed evidence, assumptions, missing information, and proposed actions.' });
    setEditing(task.id);
    return task.id;
  }
  async function submit(run: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      const id = await saveTask();
      if (run) { await buzz.startRun(id, agentId, 'deep'); await refresh(); setNotice('Deep run queued. Progress appears below.'); }
      else { setEditing(null); setNotice('Research task saved to the shared project.'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save this research request.'); }
    finally { setBusy(false); }
  }
  async function continueRun() {
    if (!latestRun) return;
    setBusy(true); setError('');
    try { await buzz.retryRun(latestRun.id, 'deep'); await refresh(); setNotice('Deep run queued.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not queue the run.'); }
    finally { setBusy(false); }
  }
  return <div className="page deep-dive-page">
    <PageHeader className="page-heading" title="Deep Dive" />
    {editing ? <>
      <form className="deep-dive-editor" onSubmit={event => { event.preventDefault(); void submit(false); }}>
        <button type="button" className="btn btn-secondary deep-dive-back" disabled={busy} onClick={() => setEditing(null)}><ArrowLeft size={15} /> Requests</button>
        <div className="deep-dive-placement">
          <label>Project<SelectField aria-label="Research project" value={projectId} onChange={event => setProjectId(event.target.value)} disabled={busy || active}>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </SelectField></label>
          <label>Agent<SelectField aria-label="Research agent" value={agentId} onChange={event => setAgentId(event.target.value)} disabled={busy || active}>
            {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </SelectField></label>
        </div>
        <label>Topic<input value={topic} onChange={event => setTopic(event.target.value)} placeholder="What are you researching?" maxLength={160} disabled={busy || active} /></label>
        <label>Research request<textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Describe the question, evidence, and expected result." rows={8} required maxLength={20000} disabled={busy || active} /></label>
        <div className="deep-dive-editor-footer">
          <span>Saved in Projects · uses this agent’s context access</span>
          <div className="deep-dive-actions">
            <button className="btn btn-secondary" type="submit" disabled={busy || active || !loaded || !prompt.trim()}>Save request</button>
            <button className="btn btn-primary" type="button" disabled={busy || active || !loaded || !prompt.trim()} onClick={() => void submit(true)}><Play size={15} />{busy ? 'Queuing…' : active ? 'Run in progress' : 'Run Deep'}</button>
          </div>
        </div>
      </form>
      {latestRun && <section className="deep-dive-result" aria-label="Research run">
        <div className="deep-dive-toolbar"><h2>Latest run <span>{latestRun.status}</span></h2>
          {['completed', 'failed', 'cancelled'].includes(latestRun.status) && <button className="btn btn-secondary" disabled={busy} onClick={() => void continueRun()}><RotateCcw size={15} />{latestRun.status === 'completed' ? 'Go deeper' : 'Retry Deep'}</button>}
        </div>
        <p className="muted small">{members.find(member => member.id === latestRun.agentId)?.name} · {latestRun.mode} · {latestRun.model || 'Runtime assigned when started'}</p>
        {latestRun.error && <p role="alert">{latestRun.error}</p>}
        {latestRun.result ? <pre>{latestRun.result}</pre> : <p>{latestRun.status === 'queued' ? 'Waiting for the configured local runner.' : active ? 'The run is active. Its recorded result will appear here.' : 'No result was recorded.'}</p>}
      </section>}
    </> : <>
      <div className="deep-dive-toolbar"><h2>Requests <span>{requests.length}</span></h2><button className="btn btn-secondary" disabled={!loaded} onClick={() => open()}><Plus size={15} />New request</button></div>
      <ul className="deep-dive-list">{requests.map(request => {
        const run = runs.filter(item => item.taskId === request.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        return <li key={request.id}><button className="deep-dive-request" onClick={() => open(request)}><strong>{request.title}</strong><span>{request.description}</span><small>{request.owner} · {run?.status || 'Saved request'} · {projects.find(project => project.id === request.project)?.name}</small></button></li>;
      })}</ul>
      <section className="deep-dive-examples"><h2>Bell research prompts</h2><p>Open a prompt, review its scope, then save or run it.</p>
        {examples.map(example => <button key={example.title} className="deep-dive-request" disabled={!loaded} onClick={() => { open(); setTopic(example.title); setPrompt(example.prompt); setProjectId(example.project); setAgentId(example.agent); }}><strong>{example.title}</strong><span>{example.prompt}</span><small>Example prompt · no run started</small></button>)}
      </section>
    </>}
    {error && <p role="alert" className="deep-dive-notice">{error}</p>}
    {notice && <output className="deep-dive-notice">{notice}</output>}
  </div>;
}
