import type { ProductType } from "./types";
import type { UpgradeId } from "../game/upgrades";

export type BackendProduct = {
  productType: ProductType;
  productId: string;
};

const TOOL_PRODUCTS: Partial<Record<UpgradeId, BackendProduct>> = {
  wood: { productType: "TOOL", productId: "wooden_pickaxe" },
  iron: { productType: "TOOL", productId: "iron_pickaxe" },
  gold: { productType: "TOOL", productId: "gold_pickaxe" },
};

const CLICK_PRODUCTS = ["click_power_1", "click_power_2", "click_power_3"] as const;
const AUTO_PRODUCTS = ["basic_miner", "advanced_miner", "elite_miner"] as const;

const PRODUCT_TO_UPGRADE: Record<string, UpgradeId> = {
  wooden_pickaxe: "wood",
  iron_pickaxe: "iron",
  gold_pickaxe: "gold",
  click_power_1: "click",
  click_power_2: "click",
  click_power_3: "click",
  basic_miner: "auto",
  advanced_miner: "auto",
  elite_miner: "auto",
};

/** Map shop upgrade + current level to the backend product being purchased next. */
export function productForUpgrade(
  id: UpgradeId,
  currentLevel = 0,
): BackendProduct | null {
  if (id === "click") {
    const productId = CLICK_PRODUCTS[currentLevel];
    return productId ? { productType: "CLICK_UPGRADE", productId } : null;
  }
  if (id === "auto") {
    const productId = AUTO_PRODUCTS[currentLevel];
    return productId ? { productType: "MACHINE", productId } : null;
  }
  if (currentLevel > 0) {
    // Backend tools are one-shot; no further tiers.
    return null;
  }
  return TOOL_PRODUCTS[id] ?? null;
}

export function upgradeForProduct(productId: string): UpgradeId | null {
  return PRODUCT_TO_UPGRADE[productId] ?? null;
}

/** Infer click upgrade level from backend cumulative clickPower (1 + 0.5 + 1 + 2). */
export function clickLevelFromPower(clickPower: number): number {
  if (clickPower >= 4.5) {
    return 3;
  }
  if (clickPower >= 2.5) {
    return 2;
  }
  if (clickPower >= 1.5) {
    return 1;
  }
  return 0;
}

/** Infer auto-miner tier from owned machine codes. */
export function autoLevelFromMachines(machineCodes: string[]): number {
  if (machineCodes.includes("elite_miner")) {
    return 3;
  }
  if (machineCodes.includes("advanced_miner")) {
    return 2;
  }
  if (machineCodes.includes("basic_miner")) {
    return 1;
  }
  return 0;
}
