/** Shared portrait registry; every sheet is idle/sleep/thinking/stuck in a 2×2 grid. */
export const AGENT_CHARACTERS = ['worm', 'firefly', 'ladybug', 'caterpillar', 'octopus', 'sea-turtle', 'seal', 'pufferfish', 'seahorse'] as const;
export type AgentCharacter = typeof AGENT_CHARACTERS[number];
export const CHARACTER_NAMES: Record<AgentCharacter, string[]> = {
  worm: ['Professor Wiggles', 'Noodle McDoodle', 'Sir Squiggle'],
  firefly: ['Captain Glimmer', 'Flicker Pickles', 'Doctor Twinkle'],
  ladybug: ['Dot Comet', 'Lady Doodle', 'Polka Biscuit'],
  caterpillar: ['Count Fuzzington', 'Munch Sprout', 'Fuzzy Waffles'],
  octopus: ['Professor Inky', 'Ollie Bubbles', 'Captain Cuddle'],
  'sea-turtle': ['Shelly Noodle', 'Moss Pebble', 'Captain Flipper'],
  seal: ['Pebble Puddle', 'Biscuit Splash', 'Finley Flop'],
  pufferfish: ['Puff Pickles', 'Bubble Biscuit', 'Pip Popcorn'],
  seahorse: ['Coral Noodle', 'Sunny Seabiscuit', 'Captain Curly'],
};
