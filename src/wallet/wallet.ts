import { FALLBACK_CATALOG, type CatalogItem } from "../api/types";

export type WalletState = {
  coins: number;
  owned: string[];
  active: string[];
  blocksBroken: number;
  clickPower: number;
  resources: Record<string, number>;
  equippedToolCode: string | null;
};

const STORAGE_KEY = "kraft-clicker-wallet";
export const START_COINS = 50;

export const LOCAL_CATALOG: CatalogItem[] = FALLBACK_CATALOG;

export function emptyWallet(coins = START_COINS): WalletState {
  return {
    coins,
    owned: [],
    active: [],
    blocksBroken: 0,
    clickPower: 1,
    resources: {},
    equippedToolCode: null,
  };
}

export function loadWallet(): WalletState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyWallet();
    }
    const parsed = JSON.parse(raw) as Partial<WalletState>;
    const owned = Array.isArray(parsed.owned)
      ? parsed.owned.filter((id): id is string => typeof id === "string")
      : [];
    const active = Array.isArray(parsed.active)
      ? parsed.active.filter((id): id is string => typeof id === "string")
      : [...owned];
    return {
      coins: typeof parsed.coins === "number" ? Math.max(0, parsed.coins) : START_COINS,
      owned,
      active,
      blocksBroken:
        typeof parsed.blocksBroken === "number" ? Math.max(0, parsed.blocksBroken) : 0,
      clickPower:
        typeof parsed.clickPower === "number" && parsed.clickPower > 0 ? parsed.clickPower : 1,
      resources:
        parsed.resources && typeof parsed.resources === "object" ? parsed.resources : {},
      equippedToolCode:
        typeof parsed.equippedToolCode === "string" ? parsed.equippedToolCode : null,
    };
  } catch {
    return emptyWallet();
  }
}

export function saveWallet(wallet: WalletState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function toolMultiplier(active: string[], equippedToolCode: string | null): number {
  const tool =
    equippedToolCode && active.includes(equippedToolCode)
      ? equippedToolCode
      : active.includes("iron_pickaxe")
        ? "iron_pickaxe"
        : active.includes("wooden_pickaxe")
          ? "wooden_pickaxe"
          : null;
  if (tool === "iron_pickaxe") {
    return 1.8;
  }
  if (tool === "wooden_pickaxe") {
    return 1.2;
  }
  return 1;
}

export function effectiveClickPower(clickPower: number, active: string[]): number {
  if (active.includes("click_power_1")) {
    return Math.max(1, clickPower);
  }
  return 1;
}

export function catalogTitleKey(
  productId: string,
): "shopClick" | "shopPickWood" | "shopPickIron" | "shopMachine" | null {
  if (productId === "click_power_1") {
    return "shopClick";
  }
  if (productId === "wooden_pickaxe") {
    return "shopPickWood";
  }
  if (productId === "iron_pickaxe") {
    return "shopPickIron";
  }
  if (productId === "basic_miner") {
    return "shopMachine";
  }
  return null;
}
