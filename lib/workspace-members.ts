"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
export type AccessLevel = "Public" | "Internal" | "Confidential" | "Restricted";
export type AgentCharacter = "worm" | "firefly" | "ladybug" | "caterpillar";
type MemberBase = { id: string; name: string; initials: string; tone?: string };
export type HumanMember = MemberBase & { kind: "human" };
export type AgentMember = MemberBase & {
  kind: "agent";
  homeId: string;
  character: AgentCharacter;
  instructions: string;
  accessLevel: AccessLevel;
  runtime: "local" | "cloud";
  role: string;
  description: string;
  model: string;
  device: string;
  color: string;
  owner: string;
  channels: string[];
  context: string[];
  capabilities: string[];
  nameCustomized?: boolean;
  isNew?: boolean;
  paused?: boolean;
};
export type WorkspaceMember = HumanMember | AgentMember;
const storageKey = "relay.workspace-members.v1";
const characters: AgentCharacter[] = ["worm", "firefly", "ladybug", "caterpillar"];
const levels: AccessLevel[] = ["Public", "Internal", "Confidential", "Restricted"];
const capabilityOptions = [
  "Search company knowledge",
  "Draft messages & documents",
  "Create work items",
  "Use connected tools",
];
const seedAgents: Omit<
  AgentMember,
  "kind" | "homeId" | "character" | "instructions" | "accessLevel"
>[] = [
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
const initialMembers: readonly WorkspaceMember[] = [
  { id: "olivia", kind: "human", name: "Olivia Chen", initials: "OC", tone: "peach" },
  { id: "marcus", kind: "human", name: "Marcus Reed", initials: "MR", tone: "lavender" },
  { id: "you", kind: "human", name: "You", initials: "YO", tone: "you-avatar" },
  ...seedAgents.map(
    (agent, index): AgentMember => ({
      ...agent,
      kind: "agent",
      character: characters[index % characters.length],
      instructions: agent.description,
      homeId:
        agent.runtime === "cloud"
          ? agent.device === "OpenAI"
            ? "openai-preview"
            : "cloud-preview"
          : agent.device.startsWith("Studio")
            ? "studio"
            : "lab",
      accessLevel: agent.runtime === "cloud" ? "Public" : "Confidential",
      nameCustomized: true,
    }),
  ),
];
let members = initialMembers;
let hydrated = false;
const listeners = new Set<() => void>();
function text(value: unknown, fallback = "", max = 20000): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .slice(0, 100)
        .map((item) => item.slice(0, 300))
    : [];
}
function normalize(value: unknown): WorkspaceMember | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const id = text(v.id, "", 100),
    name = text(v.name, "", 60).trim();
  if (!id || !name || (v.kind !== "human" && v.kind !== "agent")) return null;
  const base = {
    id,
    name,
    initials: text(v.initials, name.slice(0, 2), 4),
    tone: text(v.tone, "", 30),
  };
  if (v.kind === "human") return { ...base, kind: "human" };
  const runtime = v.runtime === "cloud" ? "cloud" : "local";
  const instructions = text(v.instructions, text(v.description));
  return {
    ...base,
    kind: "agent",
    runtime,
    homeId: text(v.homeId, "", 100),
    character: characters.includes(v.character as AgentCharacter)
      ? (v.character as AgentCharacter)
      : "worm",
    accessLevel: levels.includes(v.accessLevel as AccessLevel)
      ? (v.accessLevel as AccessLevel)
      : runtime === "cloud"
        ? "Public"
        : "Confidential",
    instructions,
    description: instructions,
    role: text(v.role, "", 200),
    model: text(v.model, "", 200),
    device: text(v.device, "", 200),
    color: text(v.color, "slate", 30),
    owner: text(v.owner, "You", 60),
    channels: strings(v.channels),
    context: strings(v.context),
    capabilities: strings(v.capabilities),
    nameCustomized: v.nameCustomized === true,
    isNew: v.isNew === true,
    paused: v.paused === true,
  };
}
function decode(raw: string | null): readonly WorkspaceMember[] | null {
  if (!raw || raw.length > 2000000) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.members)) return null;
    const next = new Map<string, WorkspaceMember>(
      initialMembers.map((member) => [member.id, member]),
    );
    for (const value of data.members.slice(0, 1000)) {
      const member = normalize(value);
      if (member) {
        const seed = initialMembers.find((item) => item.id === member.id);
        if (!seed || seed.kind === member.kind) next.set(member.id, member);
      }
    }
    return [...next.values()];
  } catch {
    return null;
  }
}
function emit() {
  listeners.forEach((listener) => listener());
}
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = decode(window.localStorage.getItem(storageKey));
    if (saved) {
      members = saved;
      emit();
    }
  } catch {
    /* Storage may be disabled; session editing still works. */
  }
}
function onStorage(event: StorageEvent) {
  if (event.key !== storageKey) return;
  const next = event.newValue === null ? initialMembers : decode(event.newValue);
  if (next) {
    members = next;
    emit();
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== "undefined")
      window.removeEventListener("storage", onStorage);
  };
}
export function getWorkspaceMembers(): readonly WorkspaceMember[] {
  return members;
}
function getServerSnapshot() {
  return initialMembers;
}
export function useWorkspaceMembers(): readonly WorkspaceMember[] {
  const snapshot = useSyncExternalStore(subscribe, getWorkspaceMembers, getServerSnapshot);
  useEffect(hydrate, []);
  return snapshot;
}
export function useAgentMembers(): readonly AgentMember[] {
  const snapshot = useWorkspaceMembers();
  return useMemo(
    () => snapshot.filter((member): member is AgentMember => member.kind === "agent"),
    [snapshot],
  );
}
export function upsertWorkspaceMember(value: WorkspaceMember): void {
  hydrate();
  const member = normalize(value);
  if (!member) return;
  const previous = members.find((item) => item.id === member.id);
  if (previous && previous.kind !== member.kind) return;
  members = previous
    ? members.map((item) => (item.id === member.id ? member : item))
    : [...members, member];
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, members }));
  } catch {
    /* Quota or private mode: keep the in-memory directory usable. */
  }
  emit();
}
