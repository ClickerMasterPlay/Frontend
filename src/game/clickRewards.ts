import { isPickaxe, tierValue, type UpgradeLevels } from "./upgrades";

/**
 * Backend block_types.reward_credits after V14 (reward_credits = max_hp → base = 1).
 * Keep in sync with DB seed + migrations.
 */
const BLOCK_REWARD_CREDITS: Record<string, number> = {
  stone: 10,
  iron: 25,
  gold: 50,
  diamond: 100,
  netherite: 250,
};

/** Backend tool power multipliers from shop catalog. */
const TOOL_MULTIPLIERS: Record<string, number> = {
  wood: 1.2,
  wooden_pickaxe: 1.2,
  iron: 1.8,
  iron_pickaxe: 1.8,
  gold: 3.0,
  gold_pickaxe: 3.0,
};

/**
 * Same credit formula as backend GameService:
 * base = reward_credits / max_hp
 * rewardPerClick = base * clickPower * toolMultiplier
 */
export function rewardPerClick(options: {
  blockType: string;
  maxHp: number;
  toolMultiplier: number;
  clickPower: number;
}): number {
  const rewardCredits = BLOCK_REWARD_CREDITS[options.blockType] ?? options.maxHp;
  const maxHp = Math.max(1, options.maxHp);
  const base = rewardCredits / maxHp;
  const clickPower = Math.max(0, options.clickPower);
  const tool = Math.max(0, options.toolMultiplier);
  const value = base * clickPower * tool;
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value * 10000) / 10000;
}

export function toolMultiplierFor(
  upgrades: UpgradeLevels,
  _active: string[],
  equippedToolCode: string | null,
): number {
  // Backend GameService uses only equipped_tool_code — no active-list fallback.
  if (
    !equippedToolCode ||
    !isPickaxe(equippedToolCode) ||
    upgrades[equippedToolCode] < 1
  ) {
    return 1;
  }
  return TOOL_MULTIPLIERS[equippedToolCode] ?? tierValue(equippedToolCode, upgrades[equippedToolCode]);
}

export function batchClickCredits(clicks: number, perClick: number): number {
  if (clicks < 1 || perClick <= 0) {
    return 0;
  }
  return Math.ceil(clicks * perClick);
}
