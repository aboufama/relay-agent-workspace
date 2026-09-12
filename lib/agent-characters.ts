/** Shared portrait registry; every sheet is idle/sleep/thinking/stuck in a 2×2 grid. */
export const AGENT_CHARACTERS = ['octopus', 'sea-turtle', 'seal', 'pufferfish', 'seahorse'] as const;
export type AgentCharacter = typeof AGENT_CHARACTERS[number];
export const CHARACTER_NAMES: Record<AgentCharacter, string[]> = {
  octopus: ['Professor Inky', 'Ollie Bubbles', 'Captain Cuddle'],
  'sea-turtle': ['Shelly Noodle', 'Moss Pebble', 'Captain Flipper'],
  seal: ['Pebble Puddle', 'Biscuit Splash', 'Finley Flop'],
  pufferfish: ['Puff Pickles', 'Bubble Biscuit', 'Pip Popcorn'],
  seahorse: ['Coral Noodle', 'Sunny Seabiscuit', 'Captain Curly'],
};

// Keep stored profiles compatible while retiring the original land-animal portraits.
export function normalizeAgentCharacter(value: unknown): AgentCharacter {
  const aliases: Record<string, AgentCharacter> = { worm: 'octopus', firefly: 'pufferfish', ladybug: 'seahorse', caterpillar: 'sea-turtle' };
  if (typeof value !== 'string') return 'octopus';
  return AGENT_CHARACTERS.includes(value as AgentCharacter) ? value as AgentCharacter : aliases[value] ?? 'octopus';
}
