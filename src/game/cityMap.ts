import type { MessageKey } from "../i18n/strings";
import { STONES_PER_LEVEL } from "./levels";

export type PlotId =
  | "stone"
  | "blue"
  | "red"
  | "trail"
  | "river"
  | "shore"
  | "chapel"
  | "castle";

export type Plot = {
  id: PlotId;
  titleKey: MessageKey;
  /** Completed levels required before the fog lifts. Level 1 is two broken stones. */
  levels: number;
  x: number;
  y: number;
  stone: number;
  diamond: number;
  perDay: number;
};

export const PLOTS: readonly Plot[] = [
  { id: "stone", titleKey: "mapStone", levels: 0, x: 14, y: 57, stone: 0, diamond: 0, perDay: 10 },
  { id: "blue", titleKey: "mapBlue", levels: 1, x: 30, y: 56, stone: 40, diamond: 1, perDay: 40 },
  { id: "red", titleKey: "mapRed", levels: 1, x: 24, y: 80, stone: 50, diamond: 1, perDay: 25 },
  { id: "trail", titleKey: "mapTrail", levels: 2, x: 49, y: 70, stone: 120, diamond: 3, perDay: 30 },
  { id: "river", titleKey: "mapRiver", levels: 2, x: 67, y: 68, stone: 160, diamond: 4, perDay: 35 },
  { id: "shore", titleKey: "mapShore", levels: 3, x: 81, y: 39, stone: 220, diamond: 5, perDay: 40 },
  { id: "chapel", titleKey: "mapChapel", levels: 3, x: 48, y: 41, stone: 300, diamond: 6, perDay: 45 },
  { id: "castle", titleKey: "mapCastle", levels: 4, x: 49, y: 17, stone: 800, diamond: 16, perDay: 80 },
];

const STORAGE_KEY = "kraft-city";
const DAY_MS = 86_400_000;

type CitySave = {
  owned: PlotId[];
  at: number;
};

const PLOT_IDS = new Set<string>(PLOTS.map((plot) => plot.id));

function isPlotId(value: string): value is PlotId {
  return PLOT_IDS.has(value);
}

export function completedLevels(stoneIndex: number): number {
  return Math.floor(Math.max(0, stoneIndex) / STONES_PER_LEVEL);
}

export function plotById(id: string): Plot | null {
  return PLOTS.find((plot) => plot.id === id) ?? null;
}

export function isPlotOpen(plot: Plot, stoneIndex: number): boolean {
  return completedLevels(stoneIndex) >= plot.levels;
}

export function nextFogLevel(stoneIndex: number): number | null {
  const done = completedLevels(stoneIndex);
  const next = PLOTS.find((plot) => plot.levels > done);
  return next ? next.levels : null;
}

function load(): CitySave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { owned: [], at: Date.now() };
    }
    const parsed = JSON.parse(raw) as Partial<CitySave>;
    const owned = Array.isArray(parsed.owned)
      ? parsed.owned.filter((id): id is PlotId => typeof id === "string" && isPlotId(id) && id !== "stone")
      : [];
    const at = typeof parsed.at === "number" && parsed.at > 0 ? parsed.at : Date.now();
    return { owned, at };
  } catch {
    return { owned: [], at: Date.now() };
  }
}

function save(state: CitySave) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function ownedPlotIds(): PlotId[] {
  return ["stone", ...load().owned];
}

export function isPlotOwned(id: PlotId): boolean {
  return id === "stone" || load().owned.includes(id);
}

export function rememberPlot(id: PlotId) {
  if (id === "stone") {
    return;
  }
  const state = load();
  if (state.owned.includes(id)) {
    return;
  }
  save({ ...state, owned: [...state.owned, id] });
}

export function incomePerDay(owned: readonly string[]): number {
  return PLOTS.reduce((sum, plot) => {
    if (plot.id === "stone" || owned.includes(plot.id)) {
      return sum + plot.perDay;
    }
    return sum;
  }, 0);
}

export function settleCityIncome(now: number): number {
  const state = load();
  const rate = incomePerDay(["stone", ...state.owned]);
  if (rate <= 0) {
    save({ ...state, at: now });
    return 0;
  }
  const elapsed = Math.max(0, now - state.at);
  const gained = (rate * elapsed) / DAY_MS;
  const grant = Math.floor(gained * 100) / 100;
  if (grant < 0.01) {
    return 0;
  }
  const consumed = (grant / rate) * DAY_MS;
  save({ ...state, at: state.at + consumed });
  return grant;
}
