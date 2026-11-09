import type { ProductType } from "./types";
import type { UpgradeId } from "../game/upgrades";

export type BackendProduct = {
  productType: ProductType;
  productId: string;
};

const UPGRADE_TO_PRODUCT: Partial<Record<UpgradeId, BackendProduct>> = {
  wood: { productType: "TOOL", productId: "wooden_pickaxe" },
  iron: { productType: "TOOL", productId: "iron_pickaxe" },
  click: { productType: "CLICK_UPGRADE", productId: "click_power_1" },
  auto: { productType: "MACHINE", productId: "basic_miner" },
};

const PRODUCT_TO_UPGRADE: Record<string, UpgradeId> = {
  wooden_pickaxe: "wood",
  iron_pickaxe: "iron",
  click_power_1: "click",
  basic_miner: "auto",
};

export function productForUpgrade(id: UpgradeId): BackendProduct | null {
  return UPGRADE_TO_PRODUCT[id] ?? null;
}

export function upgradeForProduct(productId: string): UpgradeId | null {
  return PRODUCT_TO_UPGRADE[productId] ?? null;
}
