import { levelNumber } from "./levels";
import { strikePower, UPGRADE_IDS, nextPrice, type UpgradeLevels } from "./upgrades";

export type QuestKind = "clicks" | "break" | "earn" | "spend" | "level" | "buy" | "power";

export type QuestDef = {
  index: number;
  kind: QuestKind;
  goal: number;
  reward: number;
};

export type QuestState = {
  clicks: number;
  earned: number;
  spent: number;
  buys: number;
  claimed: number[];
};

export const VISIBLE_QUESTS = 3;

const PLAN: Array<[QuestKind, number, number]> = [
  ["clicks", 15, 2],
  ["break", 1, 5],
  ["earn", 2, 3],
  ["clicks", 40, 4],
  ["buy", 1, 12],
  ["break", 2, 8],
  ["earn", 8, 6],
  ["level", 2, 15],
  ["clicks", 100, 8],
  ["spend", 100, 20],
  ["break", 4, 12],
  ["power", 1.2, 10],
  ["earn", 25, 15],
  ["clicks", 200, 12],
  ["buy", 2, 25],
  ["break", 6, 20],
  ["level", 3, 30],
  ["spend", 400, 40],
  ["earn", 60, 30],
  ["clicks", 400, 25],
  ["power", 1.5, 35],
  ["break", 10, 40],
  ["buy", 4, 50],
  ["earn", 150, 60],
  ["level", 4, 70],
  ["clicks", 800, 50],
  ["spend", 1500, 80],
  ["break", 16, 90],
  ["power", 2, 80],
  ["earn", 400, 120],
  ["buy", 6, 140],
  ["clicks", 1500, 100],
  ["level", 5, 160],
  ["break", 24, 180],
  ["spend", 5000, 200],
  ["earn", 1000, 250],
  ["power", 3, 220],
  ["clicks", 3000, 180],
  ["buy", 8, 300],
  ["break", 36, 350],
  ["level", 7, 400],
  ["earn", 2500, 450],
  ["spend", 15000, 500],
  ["clicks", 6000, 400],
  ["power", 5, 550],
  ["break", 50, 700],
  ["buy", 10, 800],
  ["level", 9, 900],
  ["earn", 8000, 1000],
  ["clicks", 12000, 900],
  ["spend", 40000, 1200],
  ["break", 70, 1500],
  ["power", 10, 1800],
  ["level", 12, 2000],
  ["earn", 25000, 2500],
  ["clicks", 25000, 3000],
  ["break", 100, 4000],
  ["buy", 14, 4500],
  ["power", 25, 6000],
  ["level", 16, 8000],
];

export const QUESTS: QuestDef[] = PLAN.map(([kind, goal, reward], index) => ({
  index,
  kind,
  goal,
  reward,
}));

export function emptyQuestState(): QuestState {
  return { clicks: 0, earned: 0, spent: 0, buys: 0, claimed: [] };
}

export function upgradeBuyCount(upgrades: UpgradeLevels): number {
  return UPGRADE_IDS.reduce((sum, id) => sum + upgrades[id], 0);
}

export function upgradeSpend(upgrades: UpgradeLevels): number {
  let total = 0;
  for (const id of UPGRADE_IDS) {
    for (let level = 0; level < upgrades[id]; level += 1) {
      total += nextPrice(id, level) ?? 0;
    }
  }
  return total;
}

export function readQuestState(raw: unknown, upgrades: UpgradeLevels, coins: number): QuestState {
  if (!raw || typeof raw !== "object") {
    return {
      clicks: 0,
      earned: Math.max(0, coins),
      spent: upgradeSpend(upgrades),
      buys: upgradeBuyCount(upgrades),
      claimed: [],
    };
  }
  const record = raw as Partial<QuestState>;
  const claimed = Array.isArray(record.claimed)
    ? record.claimed.filter((id): id is number => typeof id === "number" && id >= 0 && id < QUESTS.length)
    : [];
  return {
    clicks: typeof record.clicks === "number" && record.clicks > 0 ? Math.floor(record.clicks) : 0,
    earned: typeof record.earned === "number" && record.earned > 0 ? record.earned : 0,
    spent: typeof record.spent === "number" && record.spent > 0 ? record.spent : 0,
    buys: typeof record.buys === "number" && record.buys > 0 ? Math.floor(record.buys) : 0,
    claimed,
  };
}

export type QuestSnapshot = {
  clicks: number;
  earned: number;
  spent: number;
  buys: number;
  blocksBroken: number;
  stoneIndex: number;
  power: number;
};

export function questSnapshot(
  quest: QuestState,
  blocksBroken: number,
  stoneIndex: number,
  power: number,
): QuestSnapshot {
  return {
    clicks: quest.clicks,
    earned: quest.earned,
    spent: quest.spent,
    buys: quest.buys,
    blocksBroken,
    stoneIndex,
    power,
  };
}

export function questValue(snapshot: QuestSnapshot, quest: QuestDef): number {
  switch (quest.kind) {
    case "clicks":
      return snapshot.clicks;
    case "break":
      return snapshot.blocksBroken;
    case "earn":
      return snapshot.earned;
    case "spend":
      return snapshot.spent;
    case "level":
      return levelNumber(snapshot.stoneIndex);
    case "buy":
      return snapshot.buys;
    case "power":
      return snapshot.power;
    default:
      return 0;
  }
}

export function questReady(snapshot: QuestSnapshot, quest: QuestDef): boolean {
  return questValue(snapshot, quest) + 1e-9 >= quest.goal;
}

export function visibleQuests(claimed: number[]): QuestDef[] {
  const done = new Set(claimed);
  return QUESTS.filter((quest) => !done.has(quest.index)).slice(0, VISIBLE_QUESTS);
}

function ruCount(value: number, one: string, few: string, many: string): string {
  const rounded = Math.abs(Math.floor(value));
  const mod100 = rounded % 100;
  const mod10 = rounded % 10;
  if (mod100 > 10 && mod100 < 20) {
    return many;
  }
  if (mod10 > 1 && mod10 < 5) {
    return few;
  }
  if (mod10 === 1) {
    return one;
  }
  return many;
}

export function questTitle(quest: QuestDef, goalText: string, russian: boolean): string {
  if (!russian) {
    switch (quest.kind) {
      case "clicks":
        return `Click ${goalText} times`;
      case "break":
        return `Break ${goalText} stones`;
      case "earn":
        return `Mine ${goalText} stones`;
      case "spend":
        return `Spend ${goalText} stones`;
      case "level":
        return `Reach level ${goalText}`;
      case "buy":
        return `Buy ${goalText} upgrades`;
      case "power":
        return `Reach click power ×${goalText}`;
      default:
        return goalText;
    }
  }
  const goal = quest.goal;
  switch (quest.kind) {
    case "clicks":
      return `Кликни ${goalText} ${ruCount(goal, "раз", "раза", "раз")}`;
    case "break":
      return `Сломай ${goalText} ${ruCount(goal, "камень", "камня", "камней")}`;
    case "earn":
      return `Добудь ${goalText} ${ruCount(goal, "камень", "камня", "камней")}`;
    case "spend":
      return `Потрать ${goalText} ${ruCount(goal, "камень", "камня", "камней")}`;
    case "level":
      return `Дойди до уровня ${goalText}`;
    case "buy":
      return `Купи ${goalText} ${ruCount(goal, "улучшение", "улучшения", "улучшений")}`;
    case "power":
      return `Доведи силу клика до ×${goalText}`;
    default:
      return goalText;
  }
}

export function questPower(levels: UpgradeLevels, active: string[], equipped: string | null): number {
  return strikePower(levels, active, equipped);
}
