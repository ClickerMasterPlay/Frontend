import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  claimChallenge,
  collectMachines,
  equipTool,
  fetchChallenges,
  fetchInventory,
  fetchProgress,
  installMachine,
  purchaseItem,
  unequipTool,
  uninstallMachine,
} from "../api/backend";
import { BackendError } from "../api/client";
import { productForUpgrade, upgradeForProduct } from "../api/productMap";
import type {
  ChallengeListPayload,
  ClickBatchResult,
  InventoryPayload,
} from "../api/types";
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

export type BuyResult = "ok" | "poor" | "owned" | "error";

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
  challenges: ChallengeListPayload | null;
  buyUpgrade: (id: UpgradeId) => Promise<BuyResult>;
  toggleActive: (productId: string) => void;
  applyClickResult: (result: ClickBatchResult) => void;
  rewardMineLocal: (credits: number, resourceCode: string, amount: number) => void;
  rewardClick: (amount: number) => void;
  advanceStone: () => void;
  claimQuest: (index: number) => void;
  stoneIndex: number;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function applyInventory(current: WalletState, inventory: InventoryPayload): WalletState {
  const upgrades = { ...current.upgrades };
  const nextActive = new Set<string>(
    current.active.filter((id) => id === "click" || id === "gold"),
  );
  let equippedToolCode: string | null = null;

  for (const tool of inventory.tools) {
    const upgrade = upgradeForProduct(tool.toolCode);
    if (!upgrade) {
      continue;
    }
    upgrades[upgrade] = Math.max(upgrades[upgrade], 1);
    if (tool.equipped) {
      nextActive.add(upgrade);
      equippedToolCode = upgrade;
    }
  }

  for (const machine of inventory.machines) {
    const upgrade = upgradeForProduct(machine.machineCode);
    if (!upgrade) {
      continue;
    }
    upgrades[upgrade] = Math.max(upgrades[upgrade], 1);
    if (machine.installed) {
      nextActive.add(upgrade);
    }
  }

  return {
    ...current,
    upgrades,
    owned: ownedIds(upgrades),
    active: Array.from(nextActive),
    equippedToolCode,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session, status, lastProgress } = useSession();
  const [wallet, setWallet] = useState<WalletState>(emptyWallet(0));
  const [ready, setReady] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeListPayload | null>(null);

  const online = status === "online" && Boolean(session);

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
    // One whole +N tick per second (matches floater).
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (!lastProgress) {
      return;
    }
    setWallet((current) => ({
      ...current,
      coins: lastProgress.credits,
      resources: lastProgress.resources,
      equippedToolCode: lastProgress.equippedToolCode
        ? upgradeForProduct(lastProgress.equippedToolCode) ?? current.equippedToolCode
        : current.equippedToolCode,
    }));
  }, [lastProgress]);

  useEffect(() => {
    if (!online || !session) {
      setChallenges(null);
      return;
    }
    let cancelled = false;
    const sync = async () => {
      try {
        const [progress, inventory, challengeList] = await Promise.all([
          fetchProgress(session.userId),
          fetchInventory(session.userId),
          fetchChallenges(session.userId),
        ]);
        if (cancelled) {
          return;
        }
        setWallet((current) =>
          applyInventory(
            {
              ...current,
              coins: progress.credits,
              resources: progress.resources,
              blocksBroken: Math.max(current.blocksBroken, challengeList.stats.blocksBroken),
              quest: {
                ...current.quest,
                clicks: Math.max(current.quest.clicks, challengeList.stats.clicks),
                earned: Math.max(current.quest.earned, challengeList.stats.earned),
                spent: Math.max(current.quest.spent, challengeList.stats.spent),
                buys: Math.max(current.quest.buys, challengeList.stats.buys),
                claimed: Array.from(
                  new Set([...current.quest.claimed, ...challengeList.claimed]),
                ),
              },
            },
            inventory,
          ),
        );
        setChallenges(challengeList);
      } catch {
        if (!cancelled) {
          setChallenges(null);
        }
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [online, session?.userId]);

  useEffect(() => {
    if (!online || !session || !wallet.active.includes("auto")) {
      return;
    }
    const tick = () => {
      void collectMachines(session.userId)
        .then((result) => {
          setWallet((current) => ({
            ...current,
            // Machines pay resources; do not clobber per-second broom coins.
            resources: result.balance.resources,
          }));
        })
        .catch(() => undefined);
    };
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [online, session?.userId, wallet.active]);

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
      challenges,
      stoneIndex: wallet.stoneIndex,
      toggleActive: (productId) => {
        if ((wallet.upgrades[productId as UpgradeId] ?? 0) < 1) {
          return;
        }
        const id = productId as UpgradeId;
        const on = wallet.active.includes(id);

        const applyLocalToggle = () => {
          setWallet((current) => {
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
        };

        if (online && session) {
          if (isPickaxe(id)) {
            const product = productForUpgrade(id);
            if (!product) {
              applyLocalToggle();
              return;
            }
            applyLocalToggle();
            void (on ? unequipTool(session.userId) : equipTool(session.userId, product.productId))
              .then((result) => {
                setWallet((current) => {
                  const equipped = result.equippedToolCode
                    ? upgradeForProduct(result.equippedToolCode)
                    : null;
                  let active = current.active.filter((item) => !isPickaxe(item));
                  if (equipped) {
                    active = [...active, equipped];
                  }
                  return {
                    ...current,
                    active,
                    equippedToolCode: equipped,
                  };
                });
              })
              .catch(() => undefined);
            return;
          }
          if (id === "auto") {
            applyLocalToggle();
            void (on
              ? uninstallMachine(session.userId, "basic_miner")
              : installMachine(session.userId, "basic_miner"))
              .then((result) => {
                setWallet((current) => ({
                  ...current,
                  coins: result.balance.credits,
                  resources: result.balance.resources,
                  active: result.installed
                    ? current.active.includes("auto")
                      ? current.active
                      : [...current.active, "auto"]
                    : current.active.filter((item) => item !== "auto"),
                  autoAt: Date.now(),
                }));
              })
              .catch(() => undefined);
            return;
          }
        }

        applyLocalToggle();
      },
      applyClickResult: (result) => {
        setWallet((current) => ({
          ...current,
          // Apply only the batch reward delta so per-second broom +N is not wiped.
          coins:
            result.rewards.credits > 0
              ? addStones(current.coins, result.rewards.credits)
              : current.coins,
          resources: result.balance.resources,
        }));
      },
      rewardClick: (amount) => {
        setWallet((current) => {
          if (online) {
            // Online stones come only from server balance responses.
            return {
              ...current,
              quest: {
                ...current.quest,
                clicks: current.quest.clicks + 1,
              },
            };
          }
          return {
            ...current,
            coins: addStones(current.coins, amount),
            quest: {
              ...current.quest,
              clicks: current.quest.clicks + 1,
              earned: addStones(current.quest.earned, Math.max(0, amount)),
            },
          };
        });
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
      buyUpgrade: async (id) => {
        const level = wallet.upgrades[id];
        const price = nextPrice(id, level);
        if (price === null) {
          return "owned";
        }
        if (wallet.coins < price) {
          return "poor";
        }

        if (online && session && level === 0) {
          const product = productForUpgrade(id);
          if (product) {
            try {
              const purchased = await purchaseItem(
                session.userId,
                product.productType,
                product.productId,
              );
              let inventory = await fetchInventory(session.userId);
              if (id === "auto") {
                await installMachine(session.userId, product.productId);
                inventory = await fetchInventory(session.userId);
              }
              if (isPickaxe(id)) {
                await equipTool(session.userId, product.productId);
                inventory = await fetchInventory(session.userId);
              }
              setWallet((current) =>
                applyInventory(
                  {
                    ...current,
                    coins: purchased.balance.credits,
                    resources: purchased.balance.resources,
                    quest: {
                      ...current.quest,
                      spent: addStones(current.quest.spent, purchased.price),
                      buys: current.quest.buys + 1,
                    },
                  },
                  inventory,
                ),
              );
              if (session) {
                void fetchChallenges(session.userId)
                  .then(setChallenges)
                  .catch(() => undefined);
              }
              return "ok";
            } catch (err) {
              const code = err instanceof BackendError ? err.code : "";
              if (code === "PRODUCT_ALREADY_OWNED") {
                try {
                  let inventory = await fetchInventory(session.userId);
                  if (id === "auto") {
                    await installMachine(session.userId, product.productId).catch(() => undefined);
                    inventory = await fetchInventory(session.userId);
                  }
                  if (isPickaxe(id)) {
                    await equipTool(session.userId, product.productId).catch(() => undefined);
                    inventory = await fetchInventory(session.userId);
                  }
                  setWallet((current) => applyInventory(current, inventory));
                  return "ok";
                } catch {
                  // Fall through to local purchase below.
                }
              }
              // Local stones can be ahead of server credits — still allow the buy locally.
              if (code !== "INSUFFICIENT_FUNDS" && code !== "PRODUCT_ALREADY_OWNED" && code !== "") {
                // Unknown server error: still try local path below.
              }
            }
          }
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
        const applyLocalClaim = () => {
          const def = QUESTS[index];
          if (!def) {
            return;
          }
          setWallet((current) => {
            if (current.quest.claimed.includes(index)) {
              return current;
            }
            return {
              ...current,
              coins: addStones(current.coins, def.reward),
              quest: {
                ...current.quest,
                claimed: [...current.quest.claimed, index],
              },
            };
          });
          setChallenges((current) => {
            if (!current || current.claimed.includes(index)) {
              return current;
            }
            return {
              ...current,
              claimed: [...current.claimed, index].sort((a, b) => a - b),
              items: current.items.filter((item) => item.index !== index),
            };
          });
        };

        if (online && session) {
          void claimChallenge(session.userId, index)
            .then((result) => {
              setChallenges(result.challenges);
              setWallet((current) => ({
                ...current,
                coins: result.balance.credits,
                resources: result.balance.resources,
                quest: {
                  ...current.quest,
                  claimed: Array.from(
                    new Set([...current.quest.claimed, ...result.challenges.claimed, index]),
                  ),
                },
              }));
            })
            .catch(() => {
              // Backend window may reject; still let the player collect locally.
              applyLocalClaim();
            });
          return;
        }

        const def = QUESTS[index];
        if (!def || wallet.quest.claimed.includes(index)) {
          return;
        }
        const snapshot = questSnapshot(
          wallet.quest,
          wallet.blocksBroken,
          wallet.stoneIndex,
          questPower(wallet.upgrades, wallet.active, wallet.equippedToolCode),
        );
        if (!questReady(snapshot, def)) {
          return;
        }
        applyLocalClaim();
      },
    }),
    [challenges, online, session, wallet],
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
