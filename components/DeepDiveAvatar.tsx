"use client";
import { useMemo } from "react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useWorkspaceMembers, type WorkspaceMember } from "@/lib/workspace-members";
import { useBuzz } from "@/lib/buzz/store";
import type { RunRecord } from "@/lib/buzz/types";

/** Resolve this result's actual group, never the latest run in its room. */
export function resultParticipantIds(runs: readonly RunRecord[], runId: string): string[] {
  const byId = new Map(runs.map((run) => [run.id, run]));
  let root = byId.get(runId);
  if (!root) return [];
  const ancestors = new Set<string>();
  while (root.kind === "subtask" && root.parentRunId) {
    if (ancestors.has(root.id) || ancestors.size >= 256) return [];
    ancestors.add(root.id);
    const parent = byId.get(root.parentRunId);
    if (!parent) return [];
    root = parent;
  }
  if (root.mode !== "deep") return [];
  const selected = root;
  const group = selected.triggerMessageId
    ? runs.filter(
        (run) =>
          run.mode === "deep" &&
          run.kind !== "subtask" &&
          run.room === selected.room &&
          run.triggerMessageId === selected.triggerMessageId,
      )
    : [selected];
  const children = new Map<string, RunRecord[]>();
  for (const run of runs) {
    if (run.kind !== "subtask" || !run.parentRunId) continue;
    const list = children.get(run.parentRunId) ?? [];
    list.push(run);
    children.set(run.parentRunId, list);
  }
  // Keep the result's actual author first, independent of store arrival order.
  const queue = [selected, ...group.filter((run) => run.id !== selected.id)].slice(0, 256);
  const seen = new Set<string>(),
    ids = new Set<string>();
  for (let index = 0; index < queue.length && seen.size < 256; index++) {
    const run = queue[index];
    if (seen.has(run.id)) continue;
    seen.add(run.id);
    ids.add(run.agentId);
    for (const child of children.get(run.id) ?? [])
      if (!seen.has(child.id) && queue.length < 1024) queue.push(child);
  }
  return [...ids];
}

export function DeepDiveAvatar({
  runId,
  author,
  name,
  initials,
  size = 36,
}: {
  runId?: string;
  author?: WorkspaceMember;
  name?: string;
  initials?: string;
  size?: number;
}) {
  const { runs } = useBuzz();
  const members = useWorkspaceMembers();
  const ids = useMemo(() => runId && runs.find(run => run.id === runId)?.status === 'completed' ? resultParticipantIds(runs, runId) : [], [runs, runId]);
  const people = ids.map((id) => ({ id, member: members.find((member) => member.id === id) }));
  if (!people.length)
    return <MemberAvatar member={author} name={name} initials={initials} size={size} />;
  if (people.length === 1)
    return (
      <MemberAvatar
        member={people[0].member}
        name={people[0].member?.name ?? people[0].id}
        initials={(people[0].member?.name ?? people[0].id).slice(0, 2)}
        size={size}
      />
    );
  const names = people.map((person) => person.member?.name ?? person.id).join(", ");
  const visible = people.slice(0, people.length > 4 ? 3 : 4);
  return (
    <span
      className="deep-dive-result-avatar"
      style={{ width: size, height: size }}
      title={`Deep dive participants: ${names}`}
    >
      <span className="deep-dive-result-avatar-label">Deep dive participants: {names}</span>
      <span className="deep-dive-result-avatar-grid" data-count={visible.length} aria-hidden="true">
        {visible.map((person) => (
          <span className="deep-dive-result-avatar-tile" key={person.id}>
            {person.member?.kind === "agent" ? (
              <AgentAvatar
                identityKey={person.id}
                character={person.member.character}
                size={size / 2}
                label={person.member.name}
              />
            ) : (
              <span className="deep-dive-result-avatar-initials">
                {(person.member?.name ?? person.id).slice(0, 2)}
              </span>
            )}
          </span>
        ))}
        {people.length > 4 && (
          <span className="deep-dive-result-avatar-tile deep-dive-result-avatar-more">
            +{people.length - 3}
          </span>
        )}
      </span>
    </span>
  );
}
