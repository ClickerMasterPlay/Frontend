import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchProgress } from "../api/backend";
import type { ClickBatchResult } from "../api/types";
import { addStones } from "../game/levels";
import {
  QUESTS,
  questReady,
  questSnapshot,
  questPower,
} from "../game/quests";
import {
  accrueAuto,
  isPickaxe,
  nextPrice,
  ownedIds,
  strikePower,
  type UpgradeId,
} from "../game/upgrades";
import { useSession } from "../session/SessionContext";
import { emptyWallet, loadWallet, saveWallet, type WalletState } from "./wallet";

export type BuyResult = "ok" | "poor" | "owned";

type WalletContextValue = {
  stones: number;
  owned: string[];
  active: string[];
  blocksBroken: number;
  resources: Record<string, number>;
  equippedToolCode: string | null;
  upgrades: WalletState["upgrades"];
  power: number;
  quest: WalletState["quest"];
  buyUpgrade: (id: UpgradeId) => BuyResult;
  toggleActive: (productId: string) => void;
  applyClickResult: (result: ClickBatchResult) => void;
  rewardMineLocal: (credits: number, resourceCode: string, amount: number) => void;
  rewardClick: (amount: number) => void;
  advanceStone: () => void;
  claimQuest: (index: number) => void;
  stoneIndex: number;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session, status, lastProgress } = useSession();
  const [wallet, setWallet] = useState<WalletState>(emptyWallet(0));
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

  useEffect(() => {
    if (!ready) {
      return;
    }
    const tick = () => {
      setWallet((current) => {
        const next = accrueAuto(current, Date.now());
        if (next === current) {
          return current;
        }
        const gained = Math.max(0, addStones(next.coins, -current.coins));
        if (gained <= 0) {
          return next;
        }
        return {
          ...next,
          quest: {
            ...next.quest,
            earned: addStones(next.quest.earned, gained),
          },
        };
      });
    };
    const timer = window.setInterval(tick, 5000);
    return () => window.clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (!lastProgress) {
      return;
    }
    setWallet((current) => ({
      ...current,
      resources: lastProgress.resources,
    }));
  }, [lastProgress]);

  useEffect(() => {
    if (status !== "online" || !session) {
      return;
    }
    void fetchProgress(session.userId)
      .then((progress) => {
        setWallet((current) => ({
          ...current,
          resources: progress.resources,
        }));
      })
      .catch(() => undefined);
  }, [session, status]);

  const value = useMemo<WalletContextValue>(
    () => ({
      stones: wallet.coins,
      owned: wallet.owned,
      active: wallet.active,
      blocksBroken: wallet.blocksBroken,
      resources: wallet.resources,
      equippedToolCode: wallet.equippedToolCode,
      upgrades: wallet.upgrades,
      power: strikePower(wallet.upgrades, wallet.active, wallet.equippedToolCode),
      quest: wallet.quest,
      stoneIndex: wallet.stoneIndex,
      toggleActive: (productId) => {
        if ((wallet.upgrades[productId as UpgradeId] ?? 0) < 1) {
          return;
        }
        setWallet((current) => {
          const id = productId as UpgradeId;
          const on = current.active.includes(id);
          if (isPickaxe(id)) {
            if (on) {
              return {
                ...current,
                active: current.active.filter((item) => item !== id),
                equippedToolCode: current.equippedToolCode === id ? null : current.equippedToolCode,
              };
            }
            return {
              ...current,
              active: [...current.active.filter((item) => !isPickaxe(item)), id],
              equippedToolCode: id,
            };
          }
          if (id === "auto" && on) {
            const flushed = accrueAuto(current, Date.now());
            return {
              ...flushed,
              active: flushed.active.filter((item) => item !== id),
              autoAt: Date.now(),
            };
          }
          return {
            ...current,
            active: on ? current.active.filter((item) => item !== id) : [...current.active, id],
            autoAt: id === "auto" ? Date.now() : current.autoAt,
          };
        });
      },
      applyClickResult: (result) => {
        setWallet((current) => ({
          ...current,
          resources: result.balance.resources,
        }));
      },
      rewardClick: (amount) => {
        setWallet((current) => ({
          ...current,
          coins: addStones(current.coins, amount),
          quest: {
            ...current.quest,
            clicks: current.quest.clicks + 1,
            earned: addStones(current.quest.earned, Math.max(0, amount)),
          },
        }));
      },
      advanceStone: () => {
        setWallet((current) => ({
          ...current,
          stoneIndex: current.stoneIndex + 1,
          blocksBroken: current.blocksBroken + 1,
        }));
      },
      rewardMineLocal: (credits, resourceCode, amount) => {
        setWallet((current) => ({
          ...current,
          coins: addStones(current.coins, credits),
          resources: {
            ...current.resources,
            [resourceCode]: (current.resources[resourceCode] ?? 0) + amount,
          },
        }));
      },
      buyUpgrade: (id) => {
        const level = wallet.upgrades[id];
        const price = nextPrice(id, level);
        if (price === null) {
          return "owned";
        }
        if (wallet.coins < price) {
          return "poor";
        }
        setWallet((current) => {
          const flushed = accrueAuto(current, Date.now());
          const currentLevel = flushed.upgrades[id];
          const currentPrice = nextPrice(id, currentLevel);
          if (currentPrice === null || flushed.coins < currentPrice) {
            return flushed;
          }
          const upgrades = { ...flushed.upgrades, [id]: currentLevel + 1 };
          let active = flushed.active;
          let equippedToolCode = flushed.equippedToolCode;
          if (currentLevel === 0) {
            if (isPickaxe(id)) {
              active = [...active.filter((item) => !isPickaxe(item)), id];
              equippedToolCode = id;
            } else if (!active.includes(id)) {
              active = [...active, id];
            }
          }
          return {
            ...flushed,
            coins: addStones(flushed.coins, -currentPrice),
            upgrades,
            owned: ownedIds(upgrades),
            active,
            equippedToolCode,
            autoAt: id === "auto" ? Date.now() : flushed.autoAt,
            quest: {
              ...flushed.quest,
              spent: addStones(flushed.quest.spent, currentPrice),
              buys: flushed.quest.buys + 1,
            },
          };
        });
        return "ok";
      },
      claimQuest: (index) => {
        const quest = QUESTS[index];
        if (!quest || wallet.quest.claimed.includes(index)) {
          return;
        }
        const snapshot = questSnapshot(
          wallet.quest,
          wallet.blocksBroken,
          wallet.stoneIndex,
          questPower(wallet.upgrades, wallet.active, wallet.equippedToolCode),
        );
        if (!questReady(snapshot, quest)) {
          return;
        }
        setWallet((current) => {
          if (current.quest.claimed.includes(index)) {
            return current;
          }
          const live = questSnapshot(
            current.quest,
            current.blocksBroken,
            current.stoneIndex,
            questPower(current.upgrades, current.active, current.equippedToolCode),
          );
          if (!questReady(live, quest)) {
            return current;
          }
          return {
            ...current,
            coins: addStones(current.coins, quest.reward),
            quest: {
              ...current.quest,
              claimed: [...current.quest.claimed, index],
            },
          };
        });
      },
    }),
    [wallet],
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
