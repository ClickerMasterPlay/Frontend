export const STONES_PER_LEVEL = 2;

const PIECES = [10, 50, 100, 500, 1000];
const REWARDS = [0.1, 0.5, 1, 5, 10];

function stepped(steps: number[], index: number): number {
  const safe = Math.max(0, index);
  if (safe < steps.length) {
    return steps[safe];
  }
  let value = steps[steps.length - 1];
  const extra = safe - (steps.length - 1);
  for (let i = 0; i < extra; i += 1) {
    value *= i % 2 === 0 ? 5 : 2;
  }
  return value;
}

export function pieceCount(stoneIndex: number): number {
  return stepped(PIECES, stoneIndex);
}

export function clickReward(stoneIndex: number): number {
  return stepped(REWARDS, stoneIndex);
}

export function levelNumber(stoneIndex: number): number {
  return Math.floor(Math.max(0, stoneIndex) / STONES_PER_LEVEL) + 1;
}

export const BIOMES = ["mountains", "cave", "sea", "meadow", "forest"] as const;
export type Biome = (typeof BIOMES)[number];

export function biomeFor(stoneIndex: number): Biome {
  const level = Math.floor(Math.max(0, stoneIndex) / STONES_PER_LEVEL);
  return BIOMES[level % BIOMES.length];
}

export const STONE_KINDS = [
  "moss",
  "lava",
  "crystal",
  "dune",
  "ice",
  "gold",
  "ruin",
  "bloom",
  "fern",
  "amber",
] as const;
export type StoneKind = (typeof STONE_KINDS)[number];

export function stoneKind(stoneIndex: number): StoneKind {
  return STONE_KINDS[Math.max(0, stoneIndex) % STONE_KINDS.length];
}

export function formatStones(value: number, comma: boolean): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return comma ? text.replace(".", ",") : text;
}

export function addStones(current: number, delta: number): number {
  return Math.round((current + delta) * 100) / 100;
}
