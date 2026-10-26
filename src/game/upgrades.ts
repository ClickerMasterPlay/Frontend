import type { MessageKey } from "../i18n/strings";
import { addStones } from "./levels";

export const UPGRADE_IDS = ["wood", "iron", "gold", "click", "auto"] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export type UpgradeLevels = Record<UpgradeId, number>;

const MAX_LEVEL = 3;

const PRICES: Record<UpgradeId, readonly number[]> = {
  wood: [250, 500, 1000],
  iron: [3000, 5000, 10000],
  gold: [20000, 50000, 100000],
  click: [100, 1000, 5000],
  auto: [1500, 5000, 10000],
};

const PICK_COEFF = {
  wood: [1.2, 1.5, 1.7],
  iron: [2, 2.5, 3],
  gold: [5, 10, 25],
} as const;

const CLICK_BONUS = [0.5, 2.5, 5] as const;
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

export function nextPrice(id: UpgradeId, level: number): number | null {
  if (level < 0 || level >= MAX_LEVEL) {
    return null;
  }
  return PRICES[id][level];
}

export function tierValue(id: UpgradeId, level: number): number {
  if (level <= 0) {
    return 0;
  }
  const index = Math.min(MAX_LEVEL, level) - 1;
  if (id === "click") {
    return CLICK_BONUS[index];
  }
  if (id === "auto") {
    return AUTO_RATES[index];
  }
  return PICK_COEFF[id][index];
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
  const rate = tierValue("auto", wallet.upgrades.auto);
  const start = wallet.autoAt > 0 ? wallet.autoAt : now;
  const elapsed = Math.max(0, now - start);
  const gain = (elapsed / 3_600_000) * rate + wallet.autoBank;
  const pay = Math.floor(gain * 100) / 100;
  if (pay <= 0) {
    return wallet.autoAt > 0 ? wallet : { ...wallet, autoAt: now };
  }
  return {
    ...wallet,
    coins: addStones(wallet.coins, pay),
    autoBank: Math.round((gain - pay) * 1000) / 1000,
    autoAt: now,
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
