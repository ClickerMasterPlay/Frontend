import { api, readGuest, readNumber, readResources } from "./client";
import type {
  AuthPayload,
  BalancePayload,
  BlockState,
  CatalogItem,
  ChallengeClaimResult,
  ChallengeItem,
  ChallengeListPayload,
  ClickBatchResult,
  InventoryMachine,
  InventoryPayload,
  InventoryTool,
  LeaderboardEntry,
  LeaderboardPayload,
  MachineCollectionResult,
  MachineStateResult,
  ProductType,
  DailyRewardClaim,
  DailyRewardStatus,
  ProgressPayload,
  PurchaseResult,
  ToolEquipmentResult,
} from "./types";

type RawAuth = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseAuth(raw: RawAuth): AuthPayload {
  return {
    userId: String(raw.userId ?? ""),
    isGuest: readGuest(raw),
    displayName: typeof raw.displayName === "string" ? raw.displayName : null,
    credits: readNumber(raw.credits),
    clickPower: readNumber(raw.clickPower, 1),
  };
}

function parseBalance(value: unknown): BalancePayload {
  const raw = asRecord(value);
  return {
    credits: readNumber(raw.credits),
    resources: readResources(raw.resources),
  };
}

function parseBlock(value: unknown): BlockState {
  const raw = asRecord(value);
  return {
    type: typeof raw.type === "string" ? raw.type : "stone",
    rarity: typeof raw.rarity === "string" ? raw.rarity : "COMMON",
    currentHp: readNumber(raw.currentHp, 10),
    maxHp: Math.max(1, readNumber(raw.maxHp, 10)),
  };
}

export async function createGuest(): Promise<AuthPayload> {
  return parseAuth(await api<RawAuth>("/api/v1/auth/guest", { method: "POST" }));
}

export async function loginAccount(email: string, password: string): Promise<AuthPayload> {
  return parseAuth(
    await api<RawAuth>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  );
}

export async function registerAccount(
  userId: string,
  email: string,
  password: string,
  displayName: string,
): Promise<AuthPayload> {
  return parseAuth(
    await api<RawAuth>("/api/v1/auth/register", {
      method: "POST",
      userId,
      body: { email, password, displayName: displayName || undefined },
    }),
  );
}

export async function fetchProgress(userId: string): Promise<ProgressPayload> {
  const raw = await api<RawAuth>("/api/v1/progress/me", { userId });
  return {
    ...parseAuth(raw),
    resources: readResources(raw.resources),
    equippedToolCode: typeof raw.equippedToolCode === "string" ? raw.equippedToolCode : null,
  };
}

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const raw = await api<{ items?: unknown[] }>("/api/v1/shop/catalog");
  return (raw.items ?? []).flatMap((item) => {
    const row = asRecord(item);
    if (typeof row.productId !== "string" || typeof row.productType !== "string") {
      return [];
    }
    return [
      {
        productType: row.productType as ProductType,
        productId: row.productId,
        price: readNumber(row.price),
        effect: typeof row.effect === "string" ? row.effect : "",
      },
    ];
  });
}

export async function purchaseItem(
  userId: string,
  productType: ProductType,
  productId: string,
): Promise<PurchaseResult> {
  const raw = await api<RawAuth>("/api/v1/shop/purchase", {
    method: "POST",
    userId,
    idempotencyKey: crypto.randomUUID(),
    body: { productType, productId },
  });
  return {
    purchaseId: String(raw.purchaseId ?? ""),
    productType: raw.productType as ProductType,
    productId: String(raw.productId ?? productId),
    price: readNumber(raw.price),
    status: String(raw.status ?? ""),
    balance: parseBalance(raw.balance),
    clickPower: readNumber(raw.clickPower, 1),
  };
}

export async function sendClickBatch(
  userId: string,
  clicks: number,
): Promise<ClickBatchResult> {
  const raw = await api<RawAuth>("/api/v1/game/click-batch", {
    method: "POST",
    userId,
    body: { clientBatchId: crypto.randomUUID(), clicks },
  });
  return {
    destroyed: Boolean(raw.destroyed),
    block: parseBlock(raw.block),
    rewards: parseBalance(raw.rewards),
    balance: parseBalance(raw.balance),
  };
}

export async function fetchBalance(userId: string): Promise<BalancePayload> {
  return parseBalance(await api<RawAuth>("/api/v1/economy/balance", { userId }));
}

function parseTool(value: unknown): InventoryTool | null {
  const raw = asRecord(value);
  if (typeof raw.toolCode !== "string") {
    return null;
  }
  return {
    toolCode: raw.toolCode,
    powerMultiplier: readNumber(raw.powerMultiplier, 1),
    equipped: Boolean(raw.equipped),
    acquiredAt: typeof raw.acquiredAt === "string" ? raw.acquiredAt : null,
  };
}

function parseMachine(value: unknown): InventoryMachine | null {
  const raw = asRecord(value);
  if (typeof raw.machineCode !== "string") {
    return null;
  }
  return {
    machineCode: raw.machineCode,
    resourceCode: typeof raw.resourceCode === "string" ? raw.resourceCode : "stone",
    productionPerHour: readNumber(raw.productionPerHour),
    collectableAmount: readNumber(raw.collectableAmount),
    installed: Boolean(raw.installed),
    installedAt: typeof raw.installedAt === "string" ? raw.installedAt : null,
    acquiredAt: typeof raw.acquiredAt === "string" ? raw.acquiredAt : null,
    lastCollectedAt: typeof raw.lastCollectedAt === "string" ? raw.lastCollectedAt : null,
  };
}

export async function fetchInventory(userId: string): Promise<InventoryPayload> {
  const raw = await api<RawAuth>("/api/v1/inventory", { userId });
  return {
    tools: (Array.isArray(raw.tools) ? raw.tools : []).flatMap((item) => {
      const tool = parseTool(item);
      return tool ? [tool] : [];
    }),
    machines: (Array.isArray(raw.machines) ? raw.machines : []).flatMap((item) => {
      const machine = parseMachine(item);
      return machine ? [machine] : [];
    }),
  };
}

export async function collectMachines(userId: string): Promise<MachineCollectionResult> {
  const raw = await api<RawAuth>("/api/v1/inventory/machines/collect", {
    method: "POST",
    userId,
  });
  return {
    collectedResources: readResources(raw.collectedResources),
    balance: parseBalance(raw.balance),
    collectedAt: typeof raw.collectedAt === "string" ? raw.collectedAt : null,
  };
}

export async function installMachine(
  userId: string,
  machineCode: string,
): Promise<MachineStateResult> {
  const raw = await api<RawAuth>(`/api/v1/inventory/machines/${machineCode}/install`, {
    method: "POST",
    userId,
  });
  return {
    machineCode: String(raw.machineCode ?? machineCode),
    installed: Boolean(raw.installed),
    installedAt: typeof raw.installedAt === "string" ? raw.installedAt : null,
    lastCollectedAt: typeof raw.lastCollectedAt === "string" ? raw.lastCollectedAt : null,
    collectedResources: readResources(raw.collectedResources),
    balance: parseBalance(raw.balance),
  };
}

export async function uninstallMachine(
  userId: string,
  machineCode: string,
): Promise<MachineStateResult> {
  const raw = await api<RawAuth>(`/api/v1/inventory/machines/${machineCode}/uninstall`, {
    method: "POST",
    userId,
  });
  return {
    machineCode: String(raw.machineCode ?? machineCode),
    installed: Boolean(raw.installed),
    installedAt: typeof raw.installedAt === "string" ? raw.installedAt : null,
    lastCollectedAt: typeof raw.lastCollectedAt === "string" ? raw.lastCollectedAt : null,
    collectedResources: readResources(raw.collectedResources),
    balance: parseBalance(raw.balance),
  };
}

export async function equipTool(
  userId: string,
  toolCode: string,
): Promise<ToolEquipmentResult> {
  const raw = await api<RawAuth>(`/api/v1/inventory/tools/${toolCode}/equip`, {
    method: "POST",
    userId,
  });
  return {
    equippedToolCode: typeof raw.equippedToolCode === "string" ? raw.equippedToolCode : null,
    baseClickPower: readNumber(raw.baseClickPower, 1),
    toolMultiplier: readNumber(raw.toolMultiplier, 1),
    effectiveClickPower: readNumber(raw.effectiveClickPower, 1),
  };
}

export async function unequipTool(userId: string): Promise<ToolEquipmentResult> {
  const raw = await api<RawAuth>("/api/v1/inventory/tools/equipped", {
    method: "DELETE",
    userId,
  });
  return {
    equippedToolCode: typeof raw.equippedToolCode === "string" ? raw.equippedToolCode : null,
    baseClickPower: readNumber(raw.baseClickPower, 1),
    toolMultiplier: readNumber(raw.toolMultiplier, 1),
    effectiveClickPower: readNumber(raw.effectiveClickPower, 1),
  };
}

function parseChallengeItem(value: unknown): ChallengeItem | null {
  const raw = asRecord(value);
  if (typeof raw.index !== "number") {
    return null;
  }
  return {
    index: raw.index,
    kind: typeof raw.kind === "string" ? raw.kind : "",
    goal: readNumber(raw.goal),
    reward: readNumber(raw.reward),
    current: readNumber(raw.current),
    ready: Boolean(raw.ready),
  };
}

function parseChallengeList(raw: RawAuth): ChallengeListPayload {
  const stats = asRecord(raw.stats);
  return {
    items: (Array.isArray(raw.items) ? raw.items : []).flatMap((item) => {
      const row = parseChallengeItem(item);
      return row ? [row] : [];
    }),
    claimed: Array.isArray(raw.claimed)
      ? raw.claimed.filter((value): value is number => typeof value === "number")
      : [],
    total: readNumber(raw.total),
    stats: {
      clicks: readNumber(stats.clicks),
      blocksBroken: readNumber(stats.blocksBroken),
      earned: readNumber(stats.earned),
      spent: readNumber(stats.spent),
      buys: readNumber(stats.buys),
      level: readNumber(stats.level),
      power: readNumber(stats.power, 1),
    },
  };
}

export async function fetchChallenges(userId: string): Promise<ChallengeListPayload> {
  return parseChallengeList(await api<RawAuth>("/api/v1/challenges", { userId }));
}

export async function claimChallenge(
  userId: string,
  challengeIndex: number,
): Promise<ChallengeClaimResult> {
  const raw = await api<RawAuth>(`/api/v1/challenges/${challengeIndex}/claim`, {
    method: "POST",
    userId,
  });
  return {
    challengeIndex: readNumber(raw.challengeIndex, challengeIndex),
    reward: readNumber(raw.reward),
    balance: parseBalance(raw.balance),
    challenges: parseChallengeList(asRecord(raw.challenges)),
  };
}

function parseLeaderboardEntry(value: unknown): LeaderboardEntry | null {
  const raw = asRecord(value);
  const userId = raw.userId == null ? "" : String(raw.userId);
  if (!userId) {
    return null;
  }
  return {
    rank: Math.max(0, Math.floor(readNumber(raw.rank))),
    userId,
    displayName: typeof raw.displayName === "string" ? raw.displayName : null,
    score: readNumber(raw.score),
    credits: readNumber(raw.credits),
    totalResourcesValue: readNumber(raw.totalResourcesValue),
    clickPower: readNumber(raw.clickPower, 1),
  };
}

export async function fetchLeaderboard(
  userId: string,
  top = 100,
): Promise<LeaderboardPayload> {
  const raw = await api<RawAuth>(`/api/v1/leaderboard?top=${Math.max(1, Math.min(100, top))}`, {
    userId,
  });
  const topList = (Array.isArray(raw.top) ? raw.top : []).flatMap((item) => {
    const entry = parseLeaderboardEntry(item);
    return entry ? [entry] : [];
  });
  const me = parseLeaderboardEntry(raw.me);
  return {
    top: topList,
    me,
    totalPlayers: readNumber(raw.totalPlayers, topList.length),
  };
}

function parseCycleDay(value: unknown): number {
  const day = Math.round(readNumber(value, 1));
  if (day < 1) {
    return 1;
  }
  if (day > 7) {
    return 7;
  }
  return day;
}

export async function fetchDailyRewardStatus(userId: string): Promise<DailyRewardStatus> {
  const raw = await api<RawAuth>("/api/v1/daily-rewards/status", { userId });
  return {
    available: raw.available === true,
    cycleDay: parseCycleDay(raw.cycleDay),
    reward: readResources(raw.reward),
    serverDate: typeof raw.serverDate === "string" ? raw.serverDate : "",
    nextResetAt: typeof raw.nextResetAt === "string" ? raw.nextResetAt : "",
  };
}

export async function claimDailyReward(
  userId: string,
  idempotencyKey: string,
): Promise<DailyRewardClaim> {
  const raw = await api<RawAuth>("/api/v1/daily-rewards/claim", {
    method: "POST",
    userId,
    idempotencyKey,
  });
  return {
    cycleDay: parseCycleDay(raw.cycleDay),
    grantedResources: readResources(raw.grantedResources),
    resources: readResources(raw.resources),
    nextCycleDay: parseCycleDay(raw.nextCycleDay),
    nextAvailableAt: typeof raw.nextAvailableAt === "string" ? raw.nextAvailableAt : "",
  };
}

export async function refreshLeaderboard(userId: string): Promise<void> {
  await api<RawAuth>("/api/v1/leaderboard/refresh", {
    method: "POST",
    userId,
  });
}
