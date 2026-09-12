# Agent profile sprites

The four PNGs in public/agents are the user's original sheets. Each is a two-by-two grid, cropped in CSS by components/AgentAvatar.tsx without altering the original image.

| State | Quadrant | CSS position |
|---|---|---|
| idle | top left | 0% 0% |
| sleep | top right | 100% 0% |
| thinking | bottom left | 0% 100% |
| stuck | bottom right | 100% 100% |

Characters: worm, firefly, ladybug, caterpillar. Supply character, state, size and an accessible label to AgentAvatar. Agent creation and capability editing expose all characters and states. Chat and room context use the same component. Preview states are frontend configuration; they are not live runtime telemetry. A backend adapter can map ready to idle, stopped to sleep, working to thinking, and blocked to stuck.
