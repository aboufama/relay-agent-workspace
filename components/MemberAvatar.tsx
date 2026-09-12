'use client';
import { AgentAvatar } from './AgentAvatar';
import type { WorkspaceMember } from '@/lib/workspace-members';

const colors = [
  { backgroundColor: '#f2ded4', color: '#805744' },
  { backgroundColor: '#e5dff1', color: '#665183' },
  { backgroundColor: '#dcebe4', color: '#3d6d58' },
  { backgroundColor: '#dce7f1', color: '#426583' },
  { backgroundColor: '#f0e5c9', color: '#7b6934' },
  { backgroundColor: '#f0dce4', color: '#824f64' },
];
function avatarColor(id: string) {
  const known: Record<string, number> = {olivia: 0, marcus: 1, you: 2};
  let hash = 0;
  for (let index = 0; index < id.length; index++) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  const index = known[id] ?? hash % colors.length;
  return colors[index];
}
export function MemberAvatar({ member, name, initials, size = 32 }: { member?: WorkspaceMember; name?: string; initials?: string; size?: number }) {
  if (member?.kind === 'agent') return <AgentAvatar identityKey={member.id} character={member.character} label={member.name} size={size} />;
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Initials are a text fallback avatar, not an external image.
  return <span className="member-avatar" style={{ ...avatarColor(member?.id ?? name ?? 'you'), width: size, height: size, fontSize: Math.max(10, Math.round(size * .32)) }} role="img" aria-label={member?.name ?? name ?? 'Member'}>{member?.initials ?? initials ?? '?'}</span>;
}
