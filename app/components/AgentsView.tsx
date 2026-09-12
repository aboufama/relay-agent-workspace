import { AgentThinkingBubble } from "@/components/AgentThinkingBubble";
import {
  useAgentMembers,
  useWorkspaceMembers,
  upsertWorkspaceMember,
  type AgentMember as Agent,
} from "@/lib/workspace-members";
import { SelectField } from "@/components/SelectField";
// Identity-card layout adapted from block/buzz; see third-party notices.
import { useEffect, useRef, useState } from "react";
import { Cloud, Database, Plus } from "lucide-react";
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
type Props = { onNotify?: (message: string) => void; onNavigate?: (view: string) => void };
const characters: Character[] = ["worm", "firefly", "ladybug", "caterpillar"];
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
export function AgentsView({ onNotify }: Props) {
  const homes = useAgentHomes();
  const agents = useAgentMembers();
  const members = useWorkspaceMembers();
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
  const [saving, setSaving] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const createdCard = useRef<HTMLDivElement>(null);
  const [bubblePreviewIds, setBubblePreviewIds] = useState<string[]>(['sage', 'nova']);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setBubblePreviewIds(current => {
        const candidates = agents.filter(agent => !current.includes(agent.id));
        if (!candidates.length) return current;
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        return [current[current.length - 1], next.id].filter(Boolean);
      });
      timer = setTimeout(cycle, 4500 + Math.random() * 4500);
    };
    timer = setTimeout(cycle, 4500);
    return () => clearTimeout(timer);
  }, [agents]);
  useEffect(() => {
    if (!newlyCreatedId) return;
    const frame = requestAnimationFrame(() =>
      createdCard.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [newlyCreatedId]);
  function openAgent(agent?: Agent) {
    const nextCharacter =
      agent?.character || characters[Math.floor(Math.random() * characters.length)];
    setEditingId(agent?.id || null);
    setCharacter(nextCharacter);
    setName(
      agent?.name ||
        generatedName(
          nextCharacter,
          agents.map((item) => item.name),
        ),
    );
    setNameCustomized(agent?.nameCustomized ?? false);
    const initialHome =
      homes.find((home) => home.id === agent?.homeId) ||
      homes.find(
        (home) => agent && agent.device.startsWith(home.name) && home.kind === agent.runtime,
      ) ||
      homes.find((home) => home.kind === (agent?.runtime || "local") && home.status !== "pending");
    setHomeId(initialHome?.id || "");
    setAccessLevel(
      agent?.accessLevel || (initialHome?.kind === "cloud" ? "Public" : "Confidential"),
    );
    setInstructions(agent?.description || "");
    setAvatarChoices(!agent);
    setError("");
    setDialogOpen(true);
  }
  useEffect(() => {
    const onOpenAgent = (event: Event) => {
      const agentId = (event as CustomEvent<{ agentId?: string }>).detail?.agentId;
      const agent = agents.find((member) => member.id === agentId);
      if (agent) openAgent(agent);
    };
    window.addEventListener("relay:open-agent", onOpenAgent);
    return () => window.removeEventListener("relay:open-agent", onOpenAgent);
  });
  function saveAgent() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (
      members.some(
        (agent) =>
          agent.id !== editingId &&
          agent.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
      )
    ) {
      setError("A workspace member with this name already exists.");
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
      kind: "agent",
      instructions: instructions.trim(),
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
    setSaving(true);
    upsertWorkspaceMember(next)
      .then(() => {
        if (!editingId) setNewlyCreatedId(next.id);
        setAgentAvatarIdentity(next.name, character);
        setDialogOpen(false);
        onNotify?.(editingId ? "Agent saved." : "Agent created.");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not save the agent."))
      .finally(() => setSaving(false));
  }
  return (
    <div className="page agents-page buzz-agents-page">
      <PageHeader className="page-heading" title="Agents" />
      <div className="buzz-identity-grid" data-testid="unified-agents-groups">
        <button
          className="buzz-identity-card buzz-create-identity"
          aria-label="New agent"
          onClick={() => openAgent()}
        >
          <Plus size={28} />
        </button>
        {agents.map((agent) => (
          <div
            className={`buzz-identity-card agent-paper agent-paper-${agent.character || "worm"}${agent.id === newlyCreatedId ? " agent-card-created" : ""}`}
            ref={agent.id === newlyCreatedId ? createdCard : undefined}
            key={agent.id}
          >
            <button
              className="buzz-identity-hit"
              aria-label={`${agent.name} agent profile`}
              onClick={() => openAgent(agent)}
            />
            <div className="buzz-identity-avatar">
              <div className="agent-card-portrait">
                <AgentAvatar character={agent.character || "worm"} size={120} label={agent.name} />
                <AgentThinkingBubble name={agent.name} preview={bubblePreviewIds.includes(agent.id)} />
              </div>
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
                        if (!nameCustomized)
                          setName(
                            generatedName(
                              value,
                              agents
                                .filter((item) => item.id !== editingId)
                                .map((item) => item.name),
                            ),
                          );
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
                      ? " · Not connected"
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
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
