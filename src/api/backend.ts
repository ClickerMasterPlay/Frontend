import { api, readGuest, readNumber, readResources } from "./client";
import type {
  AuthPayload,
  BalancePayload,
  BlockState,
  CatalogItem,
  ClickBatchResult,
  ProductType,
  ProgressPayload,
  PurchaseResult,
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
