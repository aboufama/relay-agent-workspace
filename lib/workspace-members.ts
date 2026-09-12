"use client";
// Workspace directory, read from the shared Buzz store. Agent fields live in MemberRecord.data.
import { useEffect, useMemo } from "react";
import { buzz, useBuzz } from "@/lib/buzz/store";
import type { MemberRecord } from "@/lib/buzz/types";
export type AccessLevel = "Public" | "Internal" | "Confidential" | "Restricted";
import { normalizeAgentCharacter, type AgentCharacter } from './agent-characters';
export type { AgentCharacter } from './agent-characters';
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
  goal: string;
  audiences: string[];
  accessPaths: string[];
  approvalGates: string[];
  examplePrompts: string[];
  nameCustomized?: boolean;
  isNew?: boolean;
  paused?: boolean;
};
export type WorkspaceMember = HumanMember | AgentMember;
const levels: AccessLevel[] = ["Public", "Internal", "Confidential", "Restricted"];
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
    homeId: ['studio', 'lab'].includes(String(v.homeId)) ? 'lab' : ['cloud-preview', 'openai-preview'].includes(String(v.homeId)) ? 'openai-preview' : text(v.homeId, '', 100),
    character: normalizeAgentCharacter(v.character),
    accessLevel: levels.includes(v.accessLevel as AccessLevel)
      ? (v.accessLevel as AccessLevel)
      : runtime === "cloud"
        ? "Public"
        : "Confidential",
    instructions,
    description: text(v.description, instructions),
    role: text(v.role, "", 200),
    model: text(v.model, "", 200),
    device: text(v.device, "", 200),
    color: text(v.color, "slate", 30),
    owner: text(v.owner, "You", 60),
    channels: strings(v.channels),
    context: strings(v.context),
    capabilities: strings(v.capabilities),
    goal: text(v.goal),
    audiences: strings(v.audiences),
    accessPaths: strings(v.accessPaths),
    approvalGates: strings(v.approvalGates),
    examplePrompts: strings(v.examplePrompts),
    nameCustomized: v.nameCustomized === true,
    isNew: v.isNew === true,
    paused: v.paused === true,
  };
}
function fromRecord(record: MemberRecord): WorkspaceMember | null {
  const { data, ...rest } = record;
  return normalize({ ...data, ...rest });
}
// ponytail: last rendered snapshot; the store has no non-hook getter and no consumer needs one yet.
let latest: readonly WorkspaceMember[] = [];
export function getWorkspaceMembers(): readonly WorkspaceMember[] {
  return latest;
}
export function useWorkspaceMembers(): readonly WorkspaceMember[] {
  const { members } = useBuzz();
  const snapshot = useMemo(
    () => members.slice().sort((a, b) => Number(b.data.createdAt || 0) - Number(a.data.createdAt || 0)).map(fromRecord).filter((member): member is WorkspaceMember => !!member),
    [members],
  );
  useEffect(() => { latest = snapshot; }, [snapshot]);
  return snapshot;
}
export function useAgentMembers(): readonly AgentMember[] {
  const snapshot = useWorkspaceMembers();
  return useMemo(
    () => snapshot.filter((member): member is AgentMember => member.kind === "agent"),
    [snapshot],
  );
}
/** Saves an agent to the workspace; the event stream brings the stored record back. */
export async function upsertWorkspaceMember(value: WorkspaceMember): Promise<void> {
  const member = normalize(value);
  if (!member || member.kind !== "agent") return;
  const { kind: _kind, ...flat } = member;
  await buzz.saveAgent(flat);
}

export async function removeWorkspaceAgent(id: string): Promise<void> {
  await buzz.deleteAgent(id);
}
