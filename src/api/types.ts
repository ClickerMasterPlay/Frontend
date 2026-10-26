export type ProductType = "CLICK_UPGRADE" | "TOOL" | "MACHINE";

export type AuthPayload = {
  userId: string;
  isGuest: boolean;
  displayName: string | null;
  credits: number;
  clickPower: number;
};

export type ProgressPayload = AuthPayload & {
  resources: Record<string, number>;
  equippedToolCode: string | null;
};

export type CatalogItem = {
  productType: ProductType;
  productId: string;
  price: number;
  effect: string;
};

export type BalancePayload = {
  credits: number;
  resources: Record<string, number>;
};

export type BlockState = {
  type: string;
  rarity: string;
  currentHp: number;
  maxHp: number;
};

export type ClickBatchResult = {
  destroyed: boolean;
  block: BlockState;
  rewards: BalancePayload;
  balance: BalancePayload;
};

export type PurchaseResult = {
  purchaseId: string;
  productType: ProductType;
  productId: string;
  price: number;
  status: string;
  balance: BalancePayload;
  clickPower: number;
};

export const FALLBACK_CATALOG: CatalogItem[] = [
  {
    productType: "CLICK_UPGRADE",
    productId: "click_power_1",
    price: 100,
    effect: "+0.5 click power",
  },
  {
    productType: "TOOL",
    productId: "wooden_pickaxe",
    price: 250,
    effect: "x1.2 click damage",
  },
  {
    productType: "TOOL",
    productId: "iron_pickaxe",
    price: 800,
    effect: "x1.8 click damage",
  },
  {
    productType: "MACHINE",
    productId: "basic_miner",
    price: 1500,
    effect: "10 resources per hour",
  },
];

export const DEFAULT_BLOCK: BlockState = {
  type: "stone",
  rarity: "COMMON",
  currentHp: 10,
  maxHp: 10,
};

export const CLICK_BATCH_LIMIT = 50;
export const CLICK_RATE_MS = 2000;
