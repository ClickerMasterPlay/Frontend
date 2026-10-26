import { addStones } from "../game/levels";
import { emptyQuestState, readQuestState, type QuestState } from "../game/quests";
import {
  accrueAuto,
  emptyLevels,
  isPickaxe,
  legacyUpgradeId,
  ownedIds,
  readLevels,
  type UpgradeLevels,
} from "../game/upgrades";

export type WalletState = {
  coins: number;
  owned: string[];
  active: string[];
  blocksBroken: number;
  resources: Record<string, number>;
  equippedToolCode: string | null;
  stoneIndex: number;
  upgrades: UpgradeLevels;
  autoAt: number;
  autoBank: number;
  quest: QuestState;
};

const STORAGE_KEY = "kraft-clicker-wallet";
export const START_COINS = 50;

export function emptyWallet(coins = START_COINS): WalletState {
  return {
    coins,
    owned: [],
    active: [],
    blocksBroken: 0,
    resources: {},
    equippedToolCode: null,
    stoneIndex: 0,
    upgrades: emptyLevels(),
    autoAt: 0,
    autoBank: 0,
    quest: emptyQuestState(),
  };
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

export function loadWallet(): WalletState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyWallet();
    }
    const parsed = JSON.parse(raw) as Partial<WalletState> & { clickPower?: number };
    const ownedRaw = asStringList(parsed.owned);
    const clickPower = typeof parsed.clickPower === "number" ? parsed.clickPower : 1;
    const upgrades = readLevels(parsed.upgrades, ownedRaw, clickPower);
    const owned = ownedIds(upgrades);
    const activeRaw = asStringList(parsed.active);
    const activeSource = activeRaw.length > 0 ? activeRaw : ownedRaw;
    const activeIds = activeSource
      .map((id) => legacyUpgradeId(id))
      .filter((id): id is NonNullable<typeof id> => id !== null && upgrades[id] > 0);
    const equippedRaw =
      typeof parsed.equippedToolCode === "string" ? legacyUpgradeId(parsed.equippedToolCode) : null;
    const equipped =
      equippedRaw && isPickaxe(equippedRaw) && upgrades[equippedRaw] > 0 ? equippedRaw : null;
    const picks = activeIds.filter(isPickaxe);
    const equippedToolCode = equipped ?? picks[picks.length - 1] ?? null;
    const active = [
      ...new Set([
        ...activeIds.filter((id) => !isPickaxe(id)),
        ...(equippedToolCode ? [equippedToolCode] : []),
      ]),
    ];
    const quest = readQuestState(parsed.quest, upgrades, typeof parsed.coins === "number" ? parsed.coins : START_COINS);
    const before = {
        coins: typeof parsed.coins === "number" ? Math.max(0, parsed.coins) : START_COINS,
        owned,
        active,
        blocksBroken:
          typeof parsed.blocksBroken === "number" ? Math.max(0, parsed.blocksBroken) : 0,
        resources:
          parsed.resources && typeof parsed.resources === "object" ? parsed.resources : {},
        equippedToolCode,
        stoneIndex:
          typeof parsed.stoneIndex === "number" && parsed.stoneIndex >= 0
            ? Math.floor(parsed.stoneIndex)
            : 0,
        upgrades,
        autoAt: typeof parsed.autoAt === "number" && parsed.autoAt > 0 ? parsed.autoAt : Date.now(),
        autoBank: typeof parsed.autoBank === "number" && parsed.autoBank > 0 ? parsed.autoBank : 0,
        quest,
      };
    const accrued = accrueAuto(before, Date.now());
    const gained = Math.max(0, addStones(accrued.coins, -before.coins));
    if (gained <= 0) {
      return accrued;
    }
    return {
      ...accrued,
      quest: {
        ...accrued.quest,
        earned: addStones(accrued.quest.earned, gained),
      },
    };
  } catch {
    return emptyWallet();
  }
}

export function saveWallet(wallet: WalletState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}
