export const SHOP_ITEMS = [
  { id: "click", price: 20 },
  { id: "pick", price: 40 },
  { id: "machine", price: 80 },
] as const;

export type ShopItemId = (typeof SHOP_ITEMS)[number]["id"];

export type WalletState = {
  coins: number;
  owned: ShopItemId[];
  blocksBroken: number;
};

const STORAGE_KEY = "kraft-clicker-wallet";
export const START_COINS = 50;

export function loadWallet(): WalletState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { coins: START_COINS, owned: [], blocksBroken: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<WalletState>;
    const coins = typeof parsed.coins === "number" ? Math.max(0, parsed.coins) : START_COINS;
    const owned = Array.isArray(parsed.owned)
      ? parsed.owned.filter((id): id is ShopItemId =>
          SHOP_ITEMS.some((item) => item.id === id),
        )
      : [];
    const blocksBroken =
      typeof parsed.blocksBroken === "number" ? Math.max(0, parsed.blocksBroken) : 0;
    return { coins, owned, blocksBroken };
  } catch {
    return { coins: START_COINS, owned: [], blocksBroken: 0 };
  }
}

export function saveWallet(wallet: WalletState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}
