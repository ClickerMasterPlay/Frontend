export type RewardKind = "stone" | "diamond";

export type RewardPart = {
  kind: RewardKind;
  amount: number;
};

/** Week schedule from the daily-reward contract. Today's grant still comes from the server. */
const WEEK: Record<string, number>[] = [
  { stone: 10 },
  { diamond: 1 },
  { stone: 15, diamond: 1 },
  { stone: 20 },
  { diamond: 2 },
  { stone: 25, diamond: 2 },
  { stone: 50, diamond: 5 },
];

const STREAK_KEY = "kraft-daily-streak";
const IDEM_KEY = "kraft-daily-idem";
const MONTH_DAYS = 30;

type StreakRow = {
  count: number;
  lastDate: string;
};

function rewardParts(resources: Record<string, number>): RewardPart[] {
  const parts: RewardPart[] = [];
  const stone = resources.stone ?? 0;
  const diamond = resources.diamond ?? 0;
  if (stone > 0) {
    parts.push({ kind: "stone", amount: stone });
  }
  if (diamond > 0) {
    parts.push({ kind: "diamond", amount: diamond });
  }
  return parts;
}

export function weekReward(day: number, today: number, serverReward: Record<string, number>): RewardPart[] {
  if (day === today) {
    const fromServer = rewardParts(serverReward);
    if (fromServer.length > 0) {
      return fromServer;
    }
  }
  const table = WEEK[day - 1] ?? WEEK[0];
  return rewardParts(table);
}

/** Clock written in the server timestamp, so the label does not follow the browser timezone. */
export function resetClock(nextResetAt: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(nextResetAt);
  if (!match) {
    return "00:00 UTC";
  }
  return `${match[1]}:${match[2]} UTC`;
}

function readStreaks(): Record<string, StreakRow> {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as Record<string, StreakRow>;
  } catch {
    return {};
  }
}

function writeStreaks(rows: Record<string, StreakRow>) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(rows));
}

/** Claims already collected in the current 30-day track. A missed day does not clear it. */
export function streakCount(userId: string): number {
  const row = readStreaks()[userId];
  if (!row || typeof row.count !== "number" || row.count < 0) {
    return 0;
  }
  return Math.min(MONTH_DAYS, Math.floor(row.count));
}

/**
 * Count one successful claim. The same server date is counted once.
 * After 30 claims the track starts again at 0 for the next visit.
 */
export function noteDailyClaim(userId: string, serverDate: string): number {
  const rows = readStreaks();
  const row = rows[userId];
  if (serverDate && row && row.lastDate === serverDate) {
    return streakCount(userId);
  }
  const next = (row?.count ?? 0) + 1;
  const count = next >= MONTH_DAYS ? 0 : next;
  rows[userId] = { count, lastDate: serverDate };
  writeStreaks(rows);
  return count;
}

export function claimKey(userId: string): string {
  const storageKey = `${IDEM_KEY}:${userId}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  sessionStorage.setItem(storageKey, created);
  return created;
}

export function clearClaimKey(userId: string) {
  sessionStorage.removeItem(`${IDEM_KEY}:${userId}`);
}
