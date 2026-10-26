import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCatalog, fetchProgress, purchaseItem } from "../api/backend";
import { BackendError } from "../api/client";
import type { BalancePayload, CatalogItem, ClickBatchResult } from "../api/types";
import { FALLBACK_CATALOG } from "../api/types";
import { useSession } from "../session/SessionContext";
import {
  emptyWallet,
  loadWallet,
  LOCAL_CATALOG,
  saveWallet,
  type WalletState,
} from "./wallet";

export type BuyResult = "ok" | "poor" | "owned" | "error";

type WalletContextValue = {
  stones: number;
  owned: string[];
  active: string[];
  blocksBroken: number;
  clickPower: number;
  resources: Record<string, number>;
  equippedToolCode: string | null;
  catalog: CatalogItem[];
  lastError: string | null;
  buy: (item: CatalogItem) => Promise<BuyResult>;
  toggleActive: (productId: string) => void;
  applyClickResult: (result: ClickBatchResult) => void;
  rewardMineLocal: (credits: number, resourceCode: string, amount: number) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function applyBalance(current: WalletState, balance: BalancePayload): WalletState {
  return {
    ...current,
    coins: balance.credits,
    resources: balance.resources,
  };
}

function withOwned(current: WalletState, ids: string[]): WalletState {
  const owned = Array.from(new Set([...current.owned, ...ids.filter(Boolean)]));
  const active = Array.from(new Set([...current.active, ...ids.filter(Boolean)]));
  return { ...current, owned, active };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session, status, lastAuth, lastProgress } = useSession();
  const [wallet, setWallet] = useState<WalletState>(emptyWallet(0));
  const [catalog, setCatalog] = useState<CatalogItem[]>(LOCAL_CATALOG);
  const [ready, setReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    setWallet(loadWallet());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      saveWallet(wallet);
    }
  }, [ready, wallet]);

  useEffect(() => {
    if (lastAuth) {
      setWallet((current) => {
        const next = {
          ...current,
          coins: lastAuth.credits,
          clickPower: lastAuth.clickPower,
        };
        return lastAuth.clickPower > 1 ? withOwned(next, ["click_power_1"]) : next;
      });
    }
  }, [lastAuth]);

  useEffect(() => {
    if (!lastProgress) {
      return;
    }
    setWallet((current) => {
      const ids = [
        lastProgress.equippedToolCode ?? "",
        lastProgress.clickPower > 1 ? "click_power_1" : "",
      ];
      return withOwned(
        {
          ...current,
          coins: lastProgress.credits,
          clickPower: lastProgress.clickPower,
          resources: lastProgress.resources,
          equippedToolCode: lastProgress.equippedToolCode,
        },
        ids,
      );
    });
  }, [lastProgress]);

  useEffect(() => {
    if (status !== "online" || !session) {
      return;
    }
    void Promise.all([fetchProgress(session.userId), fetchCatalog()])
      .then(([progress, items]) => {
        setWallet((current) => {
          const ids = [
            progress.equippedToolCode ?? "",
            progress.clickPower > 1 ? "click_power_1" : "",
          ];
          return withOwned(
            {
              ...current,
              coins: progress.credits,
              clickPower: progress.clickPower,
              resources: progress.resources,
              equippedToolCode: progress.equippedToolCode,
            },
            ids,
          );
        });
        if (items.length > 0) {
          setCatalog(items);
        }
      })
      .catch(() => {
        setCatalog(FALLBACK_CATALOG);
      });
  }, [session?.userId, status]);

  const value = useMemo<WalletContextValue>(
    () => ({
      stones: wallet.coins,
      owned: wallet.owned,
      active: wallet.active,
      blocksBroken: wallet.blocksBroken,
      clickPower: wallet.clickPower,
      resources: wallet.resources,
      equippedToolCode: wallet.equippedToolCode,
      catalog,
      lastError,
      toggleActive: (productId) => {
        if (!wallet.owned.includes(productId)) {
          return;
        }
        setWallet((current) => {
          const on = current.active.includes(productId);
          const active = on
            ? current.active.filter((id) => id !== productId)
            : [...current.active, productId];
          const equippedToolCode =
            productId.includes("pickaxe") && !on
              ? productId
              : productId.includes("pickaxe") && on && current.equippedToolCode === productId
                ? null
                : current.equippedToolCode;
          return { ...current, active, equippedToolCode };
        });
      },
      applyClickResult: (result) => {
        setWallet((current) => ({
          ...applyBalance(current, result.balance),
          blocksBroken: result.destroyed ? current.blocksBroken + 1 : current.blocksBroken,
        }));
      },
      rewardMineLocal: (credits, resourceCode, amount) => {
        setWallet((current) => ({
          ...current,
          coins: current.coins + credits,
          blocksBroken: current.blocksBroken + 1,
          resources: {
            ...current.resources,
            [resourceCode]: (current.resources[resourceCode] ?? 0) + amount,
          },
        }));
      },
      buy: async (item) => {
        const unique = item.productType !== "CLICK_UPGRADE";
        if (unique && wallet.owned.includes(item.productId)) {
          return "owned";
        }
        if (wallet.coins < item.price) {
          return "poor";
        }
        if (status === "online" && session) {
          try {
            const purchased = await purchaseItem(session.userId, item.productType, item.productId);
            setWallet((current) => {
              const next = applyBalance(current, purchased.balance);
              return withOwned(
                {
                  ...next,
                  clickPower: purchased.clickPower,
                  equippedToolCode:
                    item.productType === "TOOL" ? purchased.productId : current.equippedToolCode,
                },
                [purchased.productId],
              );
            });
            setLastError(null);
            return "ok";
          } catch (err) {
            const code = err instanceof BackendError ? err.code : "";
            if (code === "INSUFFICIENT_FUNDS") {
              return "poor";
            }
            if (code === "PRODUCT_ALREADY_OWNED") {
              setWallet((current) => withOwned(current, [item.productId]));
              return "owned";
            }
            setLastError(err instanceof BackendError ? err.message : "Purchase failed");
            return "error";
          }
        }
        setWallet((current) =>
          withOwned(
            {
              ...current,
              coins: current.coins - item.price,
              clickPower:
                item.productType === "CLICK_UPGRADE"
                  ? current.clickPower + 0.5
                  : current.clickPower,
              equippedToolCode:
                item.productType === "TOOL" ? item.productId : current.equippedToolCode,
            },
            [item.productId],
          ),
        );
        return "ok";
      },
    }),
    [catalog, lastError, session, status, wallet],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return value;
}
