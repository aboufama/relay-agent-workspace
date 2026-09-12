# Agent profile sprites

The original four PNGs in public/agents remain unchanged. AgentAvatar selects a quadrant, then scales that quadrant by 1.12 inside a circular clip to hide sheet borders while retaining the portrait.

| Activity | State | Quadrant |
|---|---|---|
| Ready | idle | Top left |
| Sleeping, offline, paused | sleep | Top right |
| Working | thinking | Bottom left |
| Blocked | stuck | Bottom right |

Call setAgentActivity(name, activity) from the runtime adapter. All mounted avatars with that identity update through the same subscription, including chat, cards, and teams. There is no manual state picker. The backend connection determines when real activity events occur; idle fixtures are not runtime telemetry.

Agent creation starts with a random character and a matching editable name. Character changes regenerate untouched names. Edits are applied on Save. Draft previews do not overwrite the saved identity.
