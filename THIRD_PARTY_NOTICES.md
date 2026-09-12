# Third-party source attribution

Relay includes the PageHeader, SectionHeader, and SubsectionLabel components from [Block, Inc. — Buzz](https://github.com/block/buzz), snapshot 6c35e82bd50f4ad6587554eeb429e7378d474ba7, under the Apache License 2.0. Original file: desktop/src/shared/ui/PageHeader.tsx. The local utility import path was adapted. A copy of the license is in licenses/buzz-Apache-2.0.txt.

The adapted ChatHeader retains the title/action hierarchy from desktop/src/features/chat/ui/ChatHeader.tsx; native app services were omitted.

The sidebar, conversation layout, chooser spacing, and typography also follow Buzz's source and channel screenshots, with a monochrome palette requested by the user. Application state, Data, Compute, and standalone frontend behavior are implemented separately.

The Agents screen adapts markup and layout from Buzz desktop/src/features/agents/ui/AgentsView.tsx, UnifiedAgentsSection.tsx, AgentIdentityCard.tsx, CreateIdentityCard.tsx, and TeamsSection.tsx. State, forms, local/cloud configuration, and user-provided four-state sprites were adapted to this standalone frontend.
