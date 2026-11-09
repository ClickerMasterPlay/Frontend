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

export type InventoryTool = {
  toolCode: string;
  powerMultiplier: number;
  equipped: boolean;
  acquiredAt: string | null;
};

export type InventoryMachine = {
  machineCode: string;
  resourceCode: string;
  productionPerHour: number;
  collectableAmount: number;
  installed: boolean;
  installedAt: string | null;
  acquiredAt: string | null;
  lastCollectedAt: string | null;
};

export type InventoryPayload = {
  tools: InventoryTool[];
  machines: InventoryMachine[];
};

export type MachineCollectionResult = {
  collectedResources: Record<string, number>;
  balance: BalancePayload;
  collectedAt: string | null;
};

export type MachineStateResult = {
  machineCode: string;
  installed: boolean;
  installedAt: string | null;
  lastCollectedAt: string | null;
  collectedResources: Record<string, number>;
  balance: BalancePayload;
};

export type ToolEquipmentResult = {
  equippedToolCode: string | null;
  baseClickPower: number;
  toolMultiplier: number;
  effectiveClickPower: number;
};

export type ChallengeItem = {
  index: number;
  kind: string;
  goal: number;
  reward: number;
  current: number;
  ready: boolean;
};

export type ChallengeListPayload = {
  items: ChallengeItem[];
  claimed: number[];
  total: number;
  stats: {
    clicks: number;
    blocksBroken: number;
    earned: number;
    spent: number;
    buys: number;
    level: number;
    power: number;
  };
};

export type ChallengeClaimResult = {
  challengeIndex: number;
  reward: number;
  balance: BalancePayload;
  challenges: ChallengeListPayload;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string | null;
  score: number;
  credits: number;
  totalResourcesValue: number;
  clickPower: number;
};

export type LeaderboardPayload = {
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  totalPlayers: number;
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
