// Layout adapted from Buzz AgentsView, UnifiedAgentsSection, AgentIdentityCard and CreateIdentityCard. See repository third-party notices.
import { AgentAvatar, setAgentAvatarIdentity } from "@/components/AgentAvatar";
import { PageHeader } from "@/components/buzz/PageHeader";
import { useState } from "react";
import {
  Cloud,
  Cpu,
  Database,
  GitBranch,
  LockKeyhole,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
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

type Character = "worm" | "firefly" | "ladybug" | "caterpillar";
type SpriteState = "idle" | "sleep" | "thinking" | "stuck";
const characters: Character[] = ["worm", "firefly", "ladybug", "caterpillar"];
const spriteStates: SpriteState[] = ["idle", "sleep", "thinking", "stuck"];
function SpritePicker({
  character,
  state,
  onCharacter,
  onState,
}: {
  character: Character;
  state: SpriteState;
  onCharacter: (value: Character) => void;
  onState: (value: SpriteState) => void;
}) {
  return (
    <div className="buzz-sprite-picker">
      <fieldset>
        <legend>Avatar</legend>
        <div>
          {characters.map((value) => (
            <button
              type="button"
              key={value}
              aria-label={`${value} avatar`}
              aria-pressed={character === value}
              onClick={() => onCharacter(value)}
            >
              <AgentAvatar character={value} state={state} size={48} label={value} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span className="field-label">Preview state</span>
        <select
          aria-label="Preview state"
          className="select"
          value={state}
          onChange={(event) => onState(event.target.value as SpriteState)}
        >
          {spriteStates.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
type Runtime = "local" | "cloud";
type Agent = {
  id: string;
  character?: Character;
  spriteState?: SpriteState;
  name: string;
  role: string;
  description: string;
  runtime: Runtime;
  model: string;
  device: string;
  initials: string;
  color: string;
  owner: string;
  channels: string[];
  context: string[];
  capabilities: string[];
  isNew?: boolean;
  paused?: boolean;
};
type Props = { onNotify?: (message: string) => void; onNavigate?: (view: string) => void };
const contextOptions = [
  {
    name: "Company handbook",
    level: "Internal",
    detail: "Policies, people, and how Meridian works",
  },
  {
    name: "Product & engineering",
    level: "Internal",
    detail: "Roadmaps, architecture, and release notes",
  },
  {
    name: "Customer knowledge",
    level: "Confidential",
    detail: "Account context and customer research",
  },
  {
    name: "Financial planning",
    level: "Restricted",
    detail: "Budgets, forecasts, and board materials",
  },
];
const capabilityOptions = [
  "Search company knowledge",
  "Draft messages & documents",
  "Create work items",
  "Use connected tools",
];
const seedAgents: Agent[] = [
  {
    id: "atlas",
    name: "Atlas",
    role: "Engineering partner",
    description:
      "Turns technical questions into clear answers and helps the team ship with confidence.",
    runtime: "local",
    model: "Holo-3.1-35B-A3B",
    device: "Meridian Lab · GB10",
    initials: "At",
    color: "green",
    owner: "Alex Morgan",
    channels: ["engineering", "product"],
    context: ["Company handbook", "Product & engineering"],
    capabilities: capabilityOptions.slice(0, 3),
  },
  {
    id: "sage",
    name: "Sage",
    role: "Operations partner",
    description:
      "Connects the dots across projects, finds blockers, and keeps every handoff moving.",
    runtime: "local",
    model: "Holo-3.1-35B-A3B",
    device: "Meridian Lab · GB10",
    initials: "Sa",
    color: "amber",
    owner: "Jamie Chen",
    channels: ["operations", "team"],
    context: ["Company handbook", "Customer knowledge"],
    capabilities: capabilityOptions.slice(0, 3),
  },
  {
    id: "nova",
    name: "Nova",
    role: "Creative partner",
    description:
      "A thoughtful collaborator for campaign ideas, launch stories, and your next first draft.",
    runtime: "cloud",
    model: "Claude Sonnet",
    device: "Anthropic",
    initials: "No",
    color: "purple",
    owner: "Sam Rivera",
    channels: ["marketing", "product"],
    context: ["Company handbook"],
    capabilities: capabilityOptions.slice(0, 2),
  },
  {
    id: "iris",
    name: "Iris",
    role: "Customer partner",
    description:
      "Brings the customer perspective to every conversation, with the right account context.",
    runtime: "local",
    model: "Holo-3.1-35B-A3B",
    device: "Studio · GB10",
    initials: "Ir",
    color: "rose",
    owner: "Jordan Lee",
    channels: ["customer-success"],
    context: ["Company handbook", "Customer knowledge"],
    capabilities: capabilityOptions.slice(0, 3),
  },
  {
    id: "scout",
    name: "Scout",
    role: "Research partner",
    description:
      "Explores new questions, compares sources, and brings useful findings back to the team.",
    runtime: "cloud",
    model: "GPT",
    device: "OpenAI",
    initials: "Sc",
    color: "blue",
    owner: "Alex Morgan",
    channels: ["research", "product"],
    context: ["Company handbook", "Product & engineering"],
    capabilities: capabilityOptions,
  },
  {
    id: "ledger",
    name: "Ledger",
    role: "Finance partner",
    description:
      "Makes financial context easier to understand while keeping sensitive work close to home.",
    runtime: "local",
    model: "Holo-3.1-35B-A3B",
    device: "Studio · GB10",
    initials: "Le",
    color: "slate",
    owner: "Taylor Kim",
    channels: ["finance"],
    context: ["Company handbook", "Financial planning"],
    capabilities: capabilityOptions.slice(0, 2),
  },
];
const localModels = ["Holo-3.1-35B-A3B · NVFP4 · ~24 GB weights", "Custom model"];
const providers: Record<string, string[]> = {
  Anthropic: ["Claude Sonnet", "Claude Opus"],
  OpenAI: ["GPT", "Reasoning model"],
  Google: ["Gemini Pro", "Gemini Flash"],
  "Custom OpenAI-compatible provider": ["Configured model"],
};

export function AgentsView({ onNotify }: Props) {
  const [agents, setAgents] = useState<Agent[]>(
    seedAgents.map((agent, index) => ({
      ...agent,
      character: characters[index % characters.length],
      spriteState: "idle",
    })),
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Agent | null>(null);
  const [character, setCharacter] = useState<Character>("worm");
  const [spriteState, setSpriteState] = useState<SpriteState>("idle");
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [defaultRuntime, setDefaultRuntime] = useState<Runtime>("local");
  const [teams, setTeams] = useState<{ id: string; name: string; members: string[] }[]>([]);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const defaultInstructions =
    "Use company context to support your answers, cite your sources, and ask for a human review before taking an external action.";
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [runtime, setRuntime] = useState<Runtime>("local");
  const [device, setDevice] = useState("Meridian Lab · GB10");
  const [pairing, setPairing] = useState("");
  const [model, setModel] = useState(localModels[0]);
  const [provider, setProvider] = useState("Anthropic");
  const [cloudModel, setCloudModel] = useState("Claude Sonnet");
  const [context, setContext] = useState(["Company handbook"]);
  const [capabilities, setCapabilities] = useState(capabilityOptions.slice(0, 2));
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const visible = agents.filter(
    (a) =>
      (filter === "all" || a.runtime === filter) &&
      `${a.name} ${a.role} ${a.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const toggle = (values: string[], value: string, setter: (v: string[]) => void) =>
    setter(values.includes(value) ? values.filter((x) => x !== value) : [...values, value]);
  function startCreate() {
    setCharacter("worm");
    setSpriteState("idle");
    setName("");
    setRole("");
    setInstructions(defaultInstructions);
    setRuntime(defaultRuntime);
    setProvider("Anthropic");
    setCloudModel("Claude Sonnet");
    setDevice("Meridian Lab · GB10");
    setPairing("");
    setModel(localModels[0]);
    setContext(["Company handbook"]);
    setCapabilities(capabilityOptions.slice(0, 2));
    setError("");
    setCreating(true);
  }
  function createAgent() {
    if (!name.trim() || !role.trim()) {
      setError("Enter a name and role.");
      return;
    }
    if (runtime === "local" && device === "new" && !/^[a-zA-Z0-9-]{6,20}$/.test(pairing.trim())) {
      setError("Enter the 6–20 character GB10 pairing code.");
      return;
    }
    const agent: Agent = {
      id: `agent-${Date.now()}`,
      character,
      spriteState,
      name: name.trim(),
      role: role.trim(),
      description: instructions,
      runtime,
      model: runtime === "local" ? model.split(" · ")[0] : cloudModel,
      device:
        runtime === "local"
          ? device === "new"
            ? "New GB10 · pairing required"
            : device
          : provider,
      initials: name.trim().slice(0, 2),
      color: runtime === "local" ? "green" : "blue",
      owner: "You",
      channels: [],
      context,
      capabilities,
      isNew: true,
    };
    setAgents([...agents, agent]);
    setCreating(false);
    setSelected(null);
    onNotify?.(`${agent.name} configured for this session. Connect a runtime to activate it.`);
  }
  function updateAgent(updated: Agent) {
    setAgentAvatarIdentity(updated.name, updated.character || "worm", updated.spriteState || "idle");
    setAgents(agents.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
  }
  return (
    <div className="page agents-page buzz-agents-page">
      <PageHeader
        className="page-heading"
        title="Agents"
        description="Set up and manage your agents."
        action={
          <button className="btn btn-secondary" onClick={() => setDefaultsOpen(true)}>
            <Settings2 size={16} />
            Agent defaults
          </button>
        }
      />
      <details className="buzz-agent-filters">
        <summary>Search & filter</summary>
        <div className="agents-directory-heading">
          <div className="tabs" aria-label="Agent runtime filter">
            {[
              ["all", "All agents"],
              ["local", "Local · GB10"],
              ["cloud", "Cloud"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`tab ${filter === value ? "active" : ""}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
                <span className="agents-tab-count">
                  {value === "all"
                    ? agents.length
                    : agents.filter((a) => a.runtime === value).length}
                </span>
              </button>
            ))}
          </div>
          <label className="agents-search">
            <Search size={16} />
            <input
              aria-label="Search agents"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your agents…"
            />
            {search && (
              <button className="icon-btn" aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </label>
        </div>
      </details>
      <div className="buzz-identity-grid" data-testid="unified-agents-groups">
        <button
          className="buzz-identity-card buzz-create-identity"
          aria-label="New agent"
          data-testid="new-agent-card"
          onClick={startCreate}
        >
          <Plus size={28} />
        </button>
        {visible.map((agent) => (
          <div
            className="buzz-identity-card"
            key={agent.id}
            data-testid={`persona-agent-row-${agent.id}`}
          >
            <button
              className="buzz-identity-hit"
              aria-label={`${agent.name} agent profile`}
              onClick={() => {
                setSelected(agent);
                setEditing(false);
              }}
            />
            <div className="buzz-identity-avatar">
              <AgentAvatar
                character={agent.character || "worm"}
                state={agent.spriteState || "idle"}
                size={96}
                label={agent.name}
              />
            </div>
            <div className="buzz-identity-footer">
              <strong>{agent.name}</strong>
              <span>{agent.role}</span>
              <small>
                {agent.runtime === "local" ? "Local · GB10" : "Cloud"} ·{" "}
                {agent.paused ? "Paused in demo" : "Needs connection"}
              </small>
            </div>
          </div>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-state">
          <Search size={26} />
          <h3>No agents found</h3>
          <p>Try another name or switch your runtime filter.</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <section className="buzz-agent-teams">
        <h2>Agent teams</h2>
        <p>Group agents that work together.</p>
        <div className="buzz-identity-grid">
          <button
            className="buzz-identity-card buzz-create-identity"
            aria-label="New team"
            onClick={() => {
              setTeamId(null);
              setTeamName("");
              setTeamMembers([]);
              setTeamOpen(true);
            }}
          >
            <Plus size={28} />
          </button>
          {teams.map((team) => (
            <button
              className="buzz-identity-card buzz-team-card"
              key={team.id}
              onClick={() => {
                setTeamId(team.id);
                setTeamName(team.name);
                setTeamMembers(team.members);
                setTeamOpen(true);
              }}
            >
              <div className="buzz-team-avatars">
                {team.members.slice(0, 4).map((id) => {
                  const agent = agents.find((a) => a.id === id);
                  return agent ? (
                    <AgentAvatar
                      key={id}
                      character={agent.character || "worm"}
                      state={agent.spriteState || "idle"}
                      size={48}
                      label={agent.name}
                    />
                  ) : null;
                })}
              </div>
              <div className="buzz-identity-footer">
                <strong>{team.name}</strong>
                <span>{team.members.length} agents</span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <Dialog open={defaultsOpen} onOpenChange={setDefaultsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agent defaults</DialogTitle>
            <DialogDescription>Defaults for new configurations in this session.</DialogDescription>
          </DialogHeader>
          <label className="field">
            <span className="field-label">Runtime</span>
            <select
              className="select"
              value={defaultRuntime}
              onChange={(event) => setDefaultRuntime(event.target.value as Runtime)}
            >
              <option value="local">Local · GB10</option>
              <option value="cloud">Cloud</option>
            </select>
          </label>
          <DialogFooter>
            <button className="btn btn-primary" onClick={() => setDefaultsOpen(false)}>
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{teamId ? "Edit team" : "Create team"}</DialogTitle>
            <DialogDescription>Session configuration</DialogDescription>
          </DialogHeader>
          <form
            className="work-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!teamName.trim()) return;
              const team = {
                id: teamId || crypto.randomUUID(),
                name: teamName.trim(),
                members: teamMembers,
              };
              setTeams((current) =>
                teamId ? current.map((t) => (t.id === teamId ? team : t)) : [...current, team],
              );
              setTeamOpen(false);
            }}
          >
            <label className="field">
              <span className="field-label">Team name</span>
              <input
                className="input"
                required
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
              />
            </label>
            <fieldset>
              <legend>Members</legend>
              {agents.map((agent) => (
                <label className="buzz-team-member" key={agent.id}>
                  <input
                    type="checkbox"
                    aria-label={agent.name}
                    checked={teamMembers.includes(agent.id)}
                    onChange={() => toggle(teamMembers, agent.id, setTeamMembers)}
                  />
                  <AgentAvatar
                    character={agent.character || "worm"}
                    state={agent.spriteState || "idle"}
                    size={32}
                    label={agent.name}
                  />
                  <span>{agent.name}</span>
                </label>
              ))}
            </fieldset>
            <DialogFooter>
              {teamId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setTeams((current) => current.filter((team) => team.id !== teamId));
                    setTeamOpen(false);
                  }}
                >
                  Remove
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                {teamId ? "Save" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setEditing(false);
          }
        }}
      >
        <DialogContent className="agents-profile-dialog">
          <DialogHeader>
            <div className="agents-profile-top">
              <AgentAvatar
                character={selected?.character || "worm"}
                state={selected?.spriteState || "idle"}
                size={96}
                label={selected?.name || "Agent"}
              />
              <span
                className={`badge ${selected?.runtime === "local" ? "badge-green" : "badge-blue"}`}
              >
                {selected?.runtime === "local" ? <Cpu size={13} /> : <Cloud size={13} />}{" "}
                {selected?.runtime === "local" ? "Local · GB10" : "Cloud"}
              </span>
            </div>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.role} · Managed by {selected?.owner}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="agents-profile-body">
              {editing && (
                <SpritePicker
                  character={selected.character || "worm"}
                  state={selected.spriteState || "idle"}
                  onCharacter={(value) => updateAgent({ ...selected, character: value })}
                  onState={(value) => updateAgent({ ...selected, spriteState: value })}
                />
              )}
              <p className="agents-profile-description">{selected.description}</p>
              <div className="agents-profile-runtime">
                <div>
                  <span className="field-label">RUNTIME</span>
                  <strong>{selected.model}</strong>
                  <span className="muted small">{selected.device}</span>
                </div>
                <div>
                  <span className={`badge ${selected.isNew ? "badge-amber" : "badge-muted"}`}>
                    {selected.isNew ? "Connection required" : "Sample configuration"}
                  </span>
                </div>
              </div>
              <div className="section-heading">
                <h3>Company context</h3>
                <Database size={16} />
              </div>
              <div className="agents-context-pills">
                {selected.context.length ? (
                  selected.context.map((item) => (
                    <span key={item}>
                      <Database size={13} />
                      {item}
                    </span>
                  ))
                ) : (
                  <span>No collections selected</span>
                )}
              </div>
              <div className="section-heading">
                <h3>Capabilities</h3>
                <ShieldCheck size={16} />
              </div>
              <div className="agents-permissions">
                {capabilityOptions.map((cap) => (
                  <label key={cap}>
                    <input
                      type="checkbox"
                      checked={selected.capabilities.includes(cap)}
                      disabled={!editing}
                      onChange={() =>
                        updateAgent({
                          ...selected,
                          capabilities: selected.capabilities.includes(cap)
                            ? selected.capabilities.filter((c) => c !== cap)
                            : [...selected.capabilities, cap],
                        })
                      }
                    />
                    <span>{cap}</span>
                    {cap === "Use connected tools" && (
                      <span className="badge badge-muted">Review required</span>
                    )}
                  </label>
                ))}
              </div>
              <div className="section-heading">
                <h3>Workspace presence</h3>
                <GitBranch size={16} />
              </div>
              <div className="agents-context-pills">
                {selected.channels.length ? (
                  selected.channels.map((channel) => <span key={channel}># {channel}</span>)
                ) : (
                  <span className="muted">Invite this agent to a channel after activation.</span>
                )}
              </div>
              <div className="agents-policy-note">
                <LockKeyhole size={16} />
                <span>
                  {selected.runtime === "local"
                    ? "Configured to keep inference and attached context on a local runtime."
                    : "Configured for approved internal context. Confidential and restricted collections are excluded."}{" "}
                  Policies require a connected enforcement service.
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (!selected) return;
                updateAgent({ ...selected, paused: !selected.paused });
                onNotify?.(
                  `${selected.name} ${selected.paused ? "resumed" : "paused"} in this preview.`,
                );
              }}
            >
              {selected?.paused ? "Resume in demo" : "Pause in demo"}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditing(!editing);
                if (editing) onNotify?.("Capability configuration saved for this session.");
              }}
            >
              <Settings2 size={15} />
              {editing ? "Save configuration" : "Edit capabilities"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="agents-create-dialog">
          <DialogHeader>
            <DialogTitle>Create agent</DialogTitle>
            <DialogDescription>Session configuration · needs connection</DialogDescription>
          </DialogHeader>
          <form
            className="work-form"
            onSubmit={(event) => {
              event.preventDefault();
              createAgent();
            }}
          >
            <SpritePicker
              character={character}
              state={spriteState}
              onCharacter={setCharacter}
              onState={setSpriteState}
            />
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  className="input"
                  value={name}
                  maxLength={40}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Role</span>
                <input
                  className="input"
                  value={role}
                  maxLength={80}
                  onChange={(event) => setRole(event.target.value)}
                  required
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Instructions</span>
              <textarea
                className="textarea"
                rows={2}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Runtime</span>
                <select
                  className="select"
                  value={runtime}
                  onChange={(event) => {
                    const value = event.target.value as Runtime;
                    setRuntime(value);
                    if (value === "cloud")
                      setContext((current) =>
                        current.filter((name) =>
                          contextOptions.some(
                            (collection) =>
                              collection.name === name &&
                              !["Confidential", "Restricted"].includes(collection.level),
                          ),
                        ),
                      );
                  }}
                >
                  <option value="local">Local · GB10</option>
                  <option value="cloud">Cloud</option>
                </select>
              </label>
              {runtime === "local" ? (
                <label className="field">
                  <span className="field-label">Device</span>
                  <select
                    className="select"
                    value={device}
                    onChange={(event) => setDevice(event.target.value)}
                  >
                    <option>Meridian Lab · GB10</option>
                    <option>Studio · GB10</option>
                    <option value="new">Pair new GB10</option>
                  </select>
                </label>
              ) : (
                <label className="field">
                  <span className="field-label">Provider</span>
                  <select
                    className="select"
                    value={provider}
                    onChange={(event) => {
                      setProvider(event.target.value);
                      setCloudModel(providers[event.target.value][0]);
                    }}
                  >
                    {Object.keys(providers).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {runtime === "local" && device === "new" && (
              <label className="field">
                <span className="field-label">Pairing code</span>
                <input
                  className="input"
                  value={pairing}
                  onChange={(event) => setPairing(event.target.value.toUpperCase())}
                  placeholder="GB10-XXXX"
                  maxLength={20}
                  required
                />
              </label>
            )}
            <label className="field">
              <span className="field-label">Model</span>
              <select
                className="select"
                value={runtime === "local" ? model : cloudModel}
                onChange={(event) =>
                  runtime === "local"
                    ? setModel(event.target.value)
                    : setCloudModel(event.target.value)
                }
              >
                {(runtime === "local" ? localModels : providers[provider]).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="field-label">Collections</legend>
              <div className="agents-collection-options">
                {contextOptions.map((collection) => {
                  const blocked =
                    runtime === "cloud" &&
                    ["Confidential", "Restricted"].includes(collection.level);
                  return (
                    <label key={collection.name} className={blocked ? "agents-blocked" : ""}>
                      <input
                        type="checkbox"
                        checked={context.includes(collection.name)}
                        disabled={blocked}
                        onChange={() => toggle(context, collection.name, setContext)}
                      />
                      <span>{collection.name}</span>
                      <span className="badge badge-muted">
                        {collection.level}
                        {blocked ? " · Local only" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Capabilities</legend>
              <div className="agents-permissions">
                {capabilityOptions.map((cap) => (
                  <label key={cap}>
                    <input
                      type="checkbox"
                      checked={capabilities.includes(cap)}
                      onChange={() => toggle(capabilities, cap, setCapabilities)}
                    />
                    <span>{cap}</span>
                    {cap === "Use connected tools" && (
                      <span className="badge badge-muted">Human review</span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="agents-form-error">
                {error}
              </p>
            )}
            <DialogFooter>
              <button className="btn btn-primary" type="submit">
                Create
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
