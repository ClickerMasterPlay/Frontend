import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadWallet,
  saveWallet,
  SHOP_ITEMS,
  type ShopItemId,
  type WalletState,
} from "./wallet";

type WalletContextValue = {
  coins: number;
  owned: ShopItemId[];
  blocksBroken: number;
  buy: (id: ShopItemId) => "ok" | "poor" | "owned";
  rewardMine: (coins: number) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    coins: 0,
    owned: [],
    blocksBroken: 0,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWallet(loadWallet());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      saveWallet(wallet);
    }
  }, [ready, wallet]);

  const value = useMemo<WalletContextValue>(
    () => ({
      coins: wallet.coins,
      owned: wallet.owned,
      blocksBroken: wallet.blocksBroken,
      rewardMine: (coins) => {
        setWallet((current) => ({
          ...current,
          coins: current.coins + coins,
          blocksBroken: current.blocksBroken + 1,
        }));
      },
      buy: (id) => {
        const item = SHOP_ITEMS.find((entry) => entry.id === id);
        if (!item) {
          return "poor";
        }
        if (wallet.owned.includes(id)) {
          return "owned";
        }
        if (wallet.coins < item.price) {
          return "poor";
        }
        setWallet({
          ...wallet,
          coins: wallet.coins - item.price,
          owned: [...wallet.owned, id],
        });
        return "ok";
      },
    }),
    [wallet],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return value;
}
