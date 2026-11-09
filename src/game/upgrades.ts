import type { MessageKey } from "../i18n/strings";
import { addStones } from "./levels";

export const UPGRADE_IDS = ["wood", "iron", "gold", "click", "auto"] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export type UpgradeLevels = Record<UpgradeId, number>;

const MAX_LEVEL = 3;

/** Prices aligned with backend ProductCatalogService. */
const PRICES: Record<UpgradeId, readonly number[]> = {
  wood: [250],
  iron: [800],
  gold: [3000],
  click: [100, 500, 2000],
  auto: [1500, 6000, 25000],
};

/** Tool multipliers from backend catalog (one tier each). */
const PICK_COEFF = {
  wood: [1.2],
  iron: [1.8],
  gold: [3.0],
} as const;

/** Per-tier clickPower increase from backend click_power_1/2/3. */
const CLICK_BONUS = [0.5, 1.0, 2.0] as const;
/** Stones (currency) per second while the broom is active. */
const AUTO_RATES = [10, 50, 200] as const;

const LEGACY_IDS: Record<string, UpgradeId> = {
  wooden_pickaxe: "wood",
  iron_pickaxe: "iron",
  click_power_1: "click",
  basic_miner: "auto",
};

export function emptyLevels(): UpgradeLevels {
  return { wood: 0, iron: 0, gold: 0, click: 0, auto: 0 };
}

export function isUpgradeId(id: string): id is UpgradeId {
  return (UPGRADE_IDS as readonly string[]).includes(id);
}

export function isPickaxe(id: string): id is "wood" | "iron" | "gold" {
  return id === "wood" || id === "iron" || id === "gold";
}

export function clampLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_LEVEL, Math.floor(value)));
}

export function legacyUpgradeId(id: string): UpgradeId | null {
  if (isUpgradeId(id)) {
    return id;
  }
  return LEGACY_IDS[id] ?? null;
}

export function readLevels(
  raw: unknown,
  owned: string[],
  clickPower: number,
): UpgradeLevels {
  const levels = emptyLevels();
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const id of UPGRADE_IDS) {
      levels[id] = clampLevel(record[id]);
    }
    return levels;
  }
  for (const id of owned) {
    const upgrade = legacyUpgradeId(id);
    if (upgrade) {
      levels[upgrade] = Math.max(levels[upgrade], 1);
    }
  }
  if (clickPower > 1) {
    levels.click = Math.max(levels.click, clampLevel(Math.round((clickPower - 1) / 0.5)));
  }
  return levels;
}

export function ownedIds(levels: UpgradeLevels): string[] {
  return UPGRADE_IDS.filter((id) => levels[id] > 0);
}

export function upgradeMaxLevel(id: UpgradeId): number {
  return PRICES[id].length;
}

export function nextPrice(id: UpgradeId, level: number): number | null {
  const prices = PRICES[id];
  if (level < 0 || level >= prices.length) {
    return null;
  }
  return prices[level];
}

export function tierValue(id: UpgradeId, level: number): number {
  if (level <= 0) {
    return 0;
  }
  if (id === "click") {
    const index = Math.min(CLICK_BONUS.length, level) - 1;
    return CLICK_BONUS[index];
  }
  if (id === "auto") {
    const index = Math.min(AUTO_RATES.length, level) - 1;
    return AUTO_RATES[index];
  }
  const coeffs = PICK_COEFF[id];
  const index = Math.min(coeffs.length, level) - 1;
  return coeffs[index];
}

/** Cumulative clickPower after owning `level` click upgrades (base 1.0). */
export function clickPowerFromLevel(level: number): number {
  let power = 1;
  for (let i = 0; i < Math.max(0, level) && i < CLICK_BONUS.length; i += 1) {
    power += CLICK_BONUS[i];
  }
  return Math.round(power * 100) / 100;
}

export function strikePower(
  levels: UpgradeLevels,
  active: string[],
  equippedToolCode: string | null,
): number {
  const clickBonus = active.includes("click") ? tierValue("click", levels.click) : 0;
  const tool =
    equippedToolCode &&
    isPickaxe(equippedToolCode) &&
    active.includes(equippedToolCode) &&
    levels[equippedToolCode] > 0
      ? equippedToolCode
      : null;
  const pickCoeff = tool ? tierValue(tool, levels[tool]) : 1;
  return Math.round((pickCoeff + clickBonus) * 100) / 100;
}

type AutoWallet = {
  coins: number;
  active: string[];
  upgrades: UpgradeLevels;
  autoAt: number;
  autoBank: number;
};

export function accrueAuto<T extends AutoWallet>(wallet: T, now: number): T {
  const running = wallet.active.includes("auto") && wallet.upgrades.auto > 0;
  if (!running) {
    return wallet;
  }
  const rate = Math.round(tierValue("auto", wallet.upgrades.auto));
  const start = wallet.autoAt > 0 ? wallet.autoAt : now;
  const elapsed = Math.max(0, now - start);
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 1) {
    return wallet.autoAt > 0 ? wallet : { ...wallet, autoAt: now, autoBank: 0 };
  }
  // Exactly +rate whole stones for each full second, nothing fractional.
  const pay = seconds * rate;
  return {
    ...wallet,
    coins: addStones(wallet.coins, pay),
    autoBank: 0,
    autoAt: start + seconds * 1000,
  };
}

const TITLE_KEYS: Record<UpgradeId, MessageKey> = {
  wood: "shopPickWood",
  iron: "shopPickIron",
  gold: "shopPickGold",
  click: "shopClick",
  auto: "shopMachine",
};

export function upgradeTitleKey(id: UpgradeId): MessageKey {
  return TITLE_KEYS[id];
}

export function formatPrice(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
