"use client";
import "./deep-dive.css";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/buzz/PageHeader";
type ResearchRequest = { id: string; topic: string; prompt: string; updatedAt: number };
const storageKey = "relay.bell.deep-dive.requests.v1";
const demoRequests: ResearchRequest[] = [
  { id: 'bell-research-power', topic: 'Cedar: qualified supply versus lower cost', prompt: 'Ledger: compare qualified PSU-A launch coverage with a conditional PSU-B allocation for 4,000 Summit R8 systems. Cite sourcing and qualification evidence; identify the owner decision and keep the output Restricted.', updatedAt: Date.UTC(2026, 8, 12) },
  { id: 'bell-research-thermal', topic: 'Horizon 14: resolve the thermal tradeoff', prompt: 'Nova: compare fan curves A and B against sustained power, skin temperature, junction temperature, and acoustics. Propose the smallest next lab run; do not invent curve C measurements.', updatedAt: Date.UTC(2026, 8, 12) },
  { id: 'bell-research-public', topic: 'Summit R8: public evaluation criteria', prompt: 'Scout: prepare a public-safe checklist for serviceability and redundant power. Use only Public Product Reference and identify which claims remain design targets.', updatedAt: Date.UTC(2026, 8, 12) },
];
export function DeepDiveView() {
  const [requests, setRequests] = useState<ResearchRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try {
      const value: unknown = JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(demoRequests));
      if (Array.isArray(value))
        setRequests(
          value.filter(
            (item): item is ResearchRequest =>
              !!item &&
              typeof item === "object" &&
              typeof item.id === "string" &&
              typeof item.topic === "string" &&
              typeof item.prompt === "string" &&
              typeof item.updatedAt === "number",
          ),
        );
    } catch {
      /* An unavailable store leaves the current session usable. */
    }
    setLoaded(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(requests));
    } catch {
      queueMicrotask(() => setNotice("Changes are saved for this session only."));
    }
  }, [requests, loaded]);
  function open(request?: ResearchRequest) {
    setEditing(request?.id || "new");
    setTopic(request?.topic || "");
    setPrompt(request?.prompt || "");
    setNotice("");
  }
  function save() {
    if (!prompt.trim()) return;
    const next = {
      id: editing === "new" ? crypto.randomUUID() : editing!,
      topic: topic.trim() || prompt.trim().split("\n")[0].slice(0, 80),
      prompt: prompt.trim(),
      updatedAt: Date.now(),
    };
    setRequests((items) => [next, ...items.filter((item) => item.id !== next.id)]);
    setEditing(null);
    setNotice("Draft saved.");
  }
  return (
    <div className="page deep-dive-page">
      <PageHeader className="page-heading" title="Deep Dive" />
      {editing ? (
        <form
          className="deep-dive-editor"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <button
            type="button"
            className="btn btn-secondary deep-dive-back"
            onClick={() => setEditing(null)}
          >
            <ArrowLeft size={15} /> Requests
          </button>
          <label>
            Topic
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="What are you researching?"
              maxLength={160}
            />
          </label>
          <label>
            Research request
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the question, what matters, and any sources to consider."
              rows={9}
              required
              maxLength={20000}
            />
          </label>
          <div className="deep-dive-editor-footer">
            <span>Research draft</span>
            <button className="btn btn-primary" disabled={!loaded || !prompt.trim()} type="submit">
              Save request
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="deep-dive-toolbar">
            <h2>
              Requests <span>{requests.length}</span>
            </h2>
            <button className="btn btn-secondary" disabled={!loaded} onClick={() => open()}>
              <Plus size={15} /> New request
            </button>
          </div>
          {!requests.length ? (
            <div className="deep-dive-empty">
              <h2>What would you like to explore?</h2>
              <button className="btn btn-secondary" disabled={!loaded} onClick={() => open()}>
                Write a research request
              </button>
            </div>
          ) : (
            <ul className="deep-dive-list">
              {requests.map((request) => (
                <li key={request.id}>
                  <button className="deep-dive-request" onClick={() => open(request)}>
                    <strong>{request.topic}</strong>
                    <span>{request.prompt}</span>
                    <small>Draft</small>
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Delete ${request.topic}`}
                    onClick={() => {
                      setRequests((items) => items.filter((item) => item.id !== request.id));
                      setNotice("Request deleted.");
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {notice && <output className="deep-dive-notice">{notice}</output>}
    </div>
  );
}
