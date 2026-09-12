import { SelectField } from "@/components/SelectField";
// Identity-card layout adapted from block/buzz; see third-party notices.
import { useState } from "react";
import { Cloud, Database, Plus, Search, X } from "lucide-react";
import { AgentAvatar, setAgentAvatarIdentity } from "@/components/AgentAvatar";
import { useAgentHomes } from "@/lib/agent-homes";
import { PageHeader } from "@/components/buzz/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
type AccessLevel = "Public" | "Internal" | "Confidential" | "Restricted";
const accessLevels: AccessLevel[] = ["Public", "Internal", "Confidential", "Restricted"];
type Character = "worm" | "firefly" | "ladybug" | "caterpillar";
type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  runtime: "local" | "cloud";
  model: string;
  device: string;
  initials: string;
  color: string;
  owner: string;
  channels: string[];
  context: string[];
  capabilities: string[];
  character?: Character;
  homeId?: string;
  accessLevel?: AccessLevel;
  nameCustomized?: boolean;
  isNew?: boolean;
  paused?: boolean;
};
type Props = { onNotify?: (message: string) => void; onNavigate?: (view: string) => void };
const characters: Character[] = ["worm", "firefly", "ladybug", "caterpillar"];
const capabilityOptions = [
  "Search company knowledge",
  "Draft messages & documents",
  "Create work items",
  "Use connected tools",
];
const quirkyNames: Record<Character, string[]> = {
  worm: ["Professor Wiggles", "Noodle McDoodle", "Sir Squiggle"],
  firefly: ["Captain Glimmer", "Flicker Pickles", "Doctor Twinkle"],
  ladybug: ["Dot Comet", "Lady Doodle", "Polka Biscuit"],
  caterpillar: ["Count Fuzzington", "Munch Sprout", "Fuzzy Waffles"],
};
function generatedName(character: Character, existing: string[]) {
  const choices = quirkyNames[character];
  const base = choices[Math.floor(Math.random() * choices.length)];
  let candidate = base;
  let suffix = 2;
  while (existing.some((name) => name.toLocaleLowerCase() === candidate.toLocaleLowerCase())) {
    candidate = `${base} ${suffix++}`;
  }
  return candidate;
}
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

export function AgentsView({ onNotify }: Props) {
  const homes = useAgentHomes();
  const [agents, setAgents] = useState<Agent[]>(
    seedAgents.map((agent, index) => ({
      ...agent,
      character: characters[index % characters.length],
      nameCustomized: true,
    })),
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameCustomized, setNameCustomized] = useState(false);
  const [character, setCharacter] = useState<Character>("worm");
  const [homeId, setHomeId] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("Confidential");
  const [instructions, setInstructions] = useState("");
  const [avatarChoices, setAvatarChoices] = useState(false);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string; members: string[] }[]>([]);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const visible = agents.filter(
    (agent) =>
      (filter === "all" || agent.runtime === filter) &&
      `${agent.name} ${agent.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  function openAgent(agent?: Agent) {
    const nextCharacter =
      agent?.character || characters[Math.floor(Math.random() * characters.length)];
    setEditingId(agent?.id || null);
    setCharacter(nextCharacter);
    setName(agent?.name || generatedName(nextCharacter, agents.map((item) => item.name)));
    setNameCustomized(agent?.nameCustomized ?? false);
    const initialHome =
      homes.find((home) => home.id === agent?.homeId) ||
      homes.find((home) => agent && agent.device.startsWith(home.name) && home.kind === agent.runtime) ||
      homes.find((home) => home.kind === (agent?.runtime || "local") && home.status !== "pending");
    setHomeId(initialHome?.id || "");
    setAccessLevel(
      agent?.accessLevel || (initialHome?.kind === "cloud" ? "Public" : "Confidential"),
    );
    setInstructions(agent?.description || "");
    setAvatarChoices(false);
    setError("");
    setDialogOpen(true);
  }
  function saveAgent() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (agents.some((agent) => agent.id !== editingId && agent.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
      setError("An agent with this name already exists.");
      return;
    }
    const home = homes.find((item) => item.id === homeId);
    if (!home || home.status === "pending") {
      setError("Choose an agent home.");
      return;
    }
    const previous = agents.find((agent) => agent.id === editingId);
    const next: Agent = {
      id: editingId || crypto.randomUUID(),
      name: name.trim(),
      role: previous?.role || "",
      description: instructions.trim(),
      runtime: home?.kind || previous?.runtime || "local",
      model: previous?.model || "",
      device: home?.name || "",
      initials: name.trim().slice(0, 2),
      color: previous?.color || "slate",
      owner: previous?.owner || "You",
      channels: previous?.channels || [],
      context: previous?.context || [],
      capabilities: previous?.capabilities || [],
      character,
      homeId,
      accessLevel,
      nameCustomized,
      isNew: previous?.isNew ?? true,
      paused: previous?.paused,
    };
    setAgents((current) =>
      editingId
        ? current.map((agent) => (agent.id === editingId ? next : agent))
        : [...current, next],
    );
    setAgentAvatarIdentity(next.name, character);
    setDialogOpen(false);
    onNotify?.(editingId ? "Agent saved." : "Agent created.");
  }
  return (
    <div className="page agents-page buzz-agents-page">
      <PageHeader className="page-heading" title="Agents" />
      <details className="buzz-agent-filters">
        <summary>Search & filter</summary>
        <div className="agents-directory-heading">
          <div className="tabs" aria-label="Agent runtime filter">
            {[
              ["all", "All agents"],
              ["local", "Local"],
              ["cloud", "Cloud"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`tab ${filter === value ? "active" : ""}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="agents-search">
            <Search size={16} />
            <input
              aria-label="Search agents"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agents"
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
          onClick={() => openAgent()}
        >
          <Plus size={28} />
        </button>
        {visible.map((agent) => (
          <div
            className={`buzz-identity-card agent-paper agent-paper-${agent.character || "worm"}`}
            key={agent.id}
          >
            <button
              className="buzz-identity-hit"
              aria-label={`${agent.name} agent profile`}
              onClick={() => openAgent(agent)}
            />
            <div className="buzz-identity-avatar">
              <AgentAvatar character={agent.character || "worm"} size={120} label={agent.name} />
            </div>
            <div className="buzz-identity-footer">
              <strong className="agent-card-name">
                <span title={agent.name}>{agent.name}</span>
                {agent.runtime === "cloud" ? (
                  <Cloud size={16} aria-label="Cloud" />
                ) : (
                  <Database size={16} aria-label="Local" />
                )}
              </strong>
            </div>
          </div>
        ))}
      </div>
      {visible.length === 0 && <p className="small muted">No matching agents.</p>}
      <section className="buzz-agent-teams">
        <h2>Agent teams</h2>
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
                  const agent = agents.find((item) => item.id === id);
                  return agent ? (
                    <AgentAvatar
                      key={id}
                      character={agent.character || "worm"}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="agent-minimal-dialog">
          <DialogHeader className="sr-only">
            <DialogTitle>{editingId ? "Edit agent" : "Create agent"}</DialogTitle>
            <DialogDescription>Agent configuration</DialogDescription>
          </DialogHeader>
          <form
            className="agent-minimal-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveAgent();
            }}
          >
            <div className="agent-editor-identity">
              <button
                type="button"
                className="agent-editor-avatar"
                aria-label="Choose agent avatar"
                aria-expanded={avatarChoices}
                onClick={() => setAvatarChoices((value) => !value)}
              >
                <AgentAvatar character={character} size={128} label={name || "Agent"} preview />
              </button>
              {avatarChoices && (
                <div className="agent-avatar-choices" aria-label="Avatar choices">
                  {characters.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} avatar`}
                      aria-pressed={character === value}
                      onClick={() => {
                        setCharacter(value);
                        if (!nameCustomized) setName(generatedName(value, agents.filter((item) => item.id !== editingId).map((item) => item.name)));
                        setAvatarChoices(false);
                      }}
                    >
                      <AgentAvatar character={value} size={48} label={value} preview />
                    </button>
                  ))}
                </div>
              )}
              <input
                className="agent-editor-name"
                aria-label="Agent name"
                value={name}
                maxLength={60}
                required
                onChange={(event) => {
                  setName(event.target.value);
                  setNameCustomized(true);
                }}
              />
            </div>
            <label className="field">
              <span className="field-label">Agent home</span>
              <SelectField
                className="select"
                aria-label="Agent home"
                value={homeId}
                onChange={(event) => {
                  setHomeId(event.target.value);
                  setAccessLevel(
                    homes.find((home) => home.id === event.target.value)?.kind === "cloud"
                      ? "Public"
                      : "Confidential",
                  );
                  setError("");
                }}
              >
                <option value="" disabled>
                  Choose a home
                </option>
                {homes.map((home) => (
                  <option key={home.id} value={home.id} disabled={home.status === "pending"}>
                    {home.name}
                    {home.status === "preview"
                      ? " · Demo"
                      : home.status === "pending"
                        ? " · Pending"
                        : ""}
                  </option>
                ))}
              </SelectField>
            </label>
            <label className="field">
              <span className="field-label">Access level</span>
              <SelectField
                className="select"
                aria-label="Access level"
                value={accessLevel}
                onChange={(event) => setAccessLevel(event.target.value as AccessLevel)}
              >
                {accessLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </SelectField>
            </label>
            <label className="field">
              <span className="field-label">Instructions</span>
              <textarea
                className="textarea"
                aria-label="Agent instructions"
                rows={4}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="What should this agent do?"
              />
            </label>
            {error && (
              <p role="alert" className="agents-form-error">
                {error}
              </p>
            )}
            <DialogFooter>
              <button type="submit" className="btn btn-primary">
                {editingId ? "Save" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{teamId ? "Edit team" : "Create team"}</DialogTitle>
            <DialogDescription className="sr-only">Choose a name and members.</DialogDescription>
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
                teamId
                  ? current.map((value) => (value.id === teamId ? team : value))
                  : [...current, team],
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
                    checked={teamMembers.includes(agent.id)}
                    onChange={() =>
                      setTeamMembers((current) =>
                        current.includes(agent.id)
                          ? current.filter((id) => id !== agent.id)
                          : [...current, agent.id],
                      )
                    }
                  />
                  <AgentAvatar character={agent.character || "worm"} size={32} label={agent.name} />
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
    </div>
  );
}
