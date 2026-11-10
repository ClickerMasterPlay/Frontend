import { useEffect, useState } from "react";
import { ResourceIcon } from "../components/ResourceIcon";
import {
  PLOTS,
  isPlotOpen,
  isPlotOwned,
  nextFogLevel,
  ownedPlotIds,
  rememberPlot,
  type Plot,
  type PlotId,
} from "../game/cityMap";
import { formatStones } from "../game/levels";
import { useSettings } from "../settings/SettingsContext";
import "./CityMap.css";

type PayKind = "stone" | "diamond" | "poor";

type CityMapProps = {
  stoneIndex: number;
  stones: number;
  diamonds: number;
  onBuy: (stonePrice: number, diamondPrice: number) => PayKind;
  onClose: () => void;
};

const CLOUDS = [
  { id: "a", x: 30, y: 16, rx: 22, ry: 11 },
  { id: "b", x: 58, y: 12, rx: 24, ry: 10 },
  { id: "c", x: 80, y: 22, rx: 16, ry: 12 },
  { id: "d", x: 16, y: 30, rx: 15, ry: 11 },
  { id: "e", x: 44, y: 28, rx: 26, ry: 12 },
  { id: "f", x: 70, y: 34, rx: 18, ry: 13 },
  { id: "g", x: 28, y: 46, rx: 18, ry: 11 },
  { id: "h", x: 55, y: 48, rx: 24, ry: 12 },
  { id: "i", x: 82, y: 52, rx: 14, ry: 13 },
  { id: "j", x: 18, y: 64, rx: 14, ry: 11 },
  { id: "k", x: 46, y: 70, rx: 20, ry: 11 },
  { id: "l", x: 74, y: 72, rx: 18, ry: 12 },
  { id: "m", x: 36, y: 84, rx: 16, ry: 9 },
  { id: "n", x: 62, y: 84, rx: 18, ry: 9 },
];

function payFor(plot: Plot, stones: number, diamonds: number): PayKind {
  if (plot.stone <= 0) {
    return "stone";
  }
  if (stones >= plot.stone) {
    return "stone";
  }
  if (plot.diamond > 0 && diamonds >= plot.diamond) {
    return "diamond";
  }
  return "poor";
}

export function CityMap({ stoneIndex, stones, diamonds, onBuy, onClose }: CityMapProps) {
  const { t, settings } = useSettings();
  const [owned, setOwned] = useState<PlotId[]>(() => ownedPlotIds());
  const [selectedId, setSelectedId] = useState<PlotId | null>(null);
  const [buying, setBuying] = useState(false);
  const comma = settings.language === "ru";
  const nextLevel = nextFogLevel(stoneIndex);
  const selected = selectedId ? PLOTS.find((plot) => plot.id === selectedId) ?? null : null;
  const openPlots = PLOTS.filter((plot) => isPlotOpen(plot, stoneIndex));
  const fogGone = nextLevel === null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (selectedId) {
        setSelectedId(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, selectedId]);

  const buy = (plot: Plot) => {
    if (buying || isPlotOwned(plot.id) || !isPlotOpen(plot, stoneIndex)) {
      return;
    }
    setBuying(true);
    const result = onBuy(plot.stone, plot.diamond);
    if (result !== "poor") {
      rememberPlot(plot.id);
      setOwned(ownedPlotIds());
    }
    setBuying(false);
  };

  return (
    <div className="city">
      <div className="city__frame">
        <img className="city__art" src="/map/village.jpg" alt="" draggable={false} />
        {fogGone ? null : (
          <svg className="city__fog" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="city-soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.4" />
              </filter>
              <radialGradient id="city-hole" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000" />
                <stop offset="68%" stopColor="#000" />
                <stop offset="100%" stopColor="#fff" />
              </radialGradient>
              <mask id="city-island" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                <rect width="100" height="100" fill="#000" />
                <ellipse cx="50" cy="50" rx="48" ry="49" fill="#fff" filter="url(#city-soft)" />
              </mask>
              <mask id="city-holes" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                <rect width="100" height="100" fill="#fff" />
                {openPlots.map((plot) => (
                  <ellipse key={plot.id} cx={plot.x} cy={plot.y} rx="9" ry="11" fill="url(#city-hole)" />
                ))}
              </mask>
            </defs>
            <g mask="url(#city-island)">
              <g mask="url(#city-holes)">
                <rect width="100" height="100" fill="#f4ead8" />
                {CLOUDS.map((cloud) => (
                  <ellipse
                    key={cloud.id}
                    cx={cloud.x}
                    cy={cloud.y}
                    rx={cloud.rx}
                    ry={cloud.ry}
                    fill="#fffdf8"
                  />
                ))}
              </g>
            </g>
          </svg>
        )}
        <div className="city__pins">
          {openPlots.map((plot) => {
            const mine = owned.includes(plot.id);
            const on = selectedId === plot.id;
            return (
              <button
                key={plot.id}
                type="button"
                className={on ? "city__pin city__pin--on" : "city__pin"}
                style={{ left: `${plot.x}%`, top: `${plot.y}%`, zIndex: on ? 5 : Math.round(plot.y) }}
                aria-pressed={on}
                aria-label={mine ? `${t(plot.titleKey)}, ${t("mapMining")}` : t(plot.titleKey)}
                title={t(plot.titleKey)}
                onClick={() => setSelectedId(plot.id)}
              >
                {mine ? <span className="city__live" /> : (
                  <span className="city__chip">
                    <ResourceIcon kind="stone" size={14} />
                    {plot.stone}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {nextLevel !== null ? (
          <p className="city__next">
            {t("mapNext")} {nextLevel}
          </p>
        ) : null}
        {selected && isPlotOpen(selected, stoneIndex) ? (
          <PlotCard
            plot={selected}
            owned={owned.includes(selected.id)}
            stones={stones}
            diamonds={diamonds}
            comma={comma}
            busy={buying}
            onBuy={() => buy(selected)}
          />
        ) : null}
      </div>
    </div>
  );
}

function PlotCard({
  plot,
  owned,
  stones,
  diamonds,
  comma,
  busy,
  onBuy,
}: {
  plot: Plot;
  owned: boolean;
  stones: number;
  diamonds: number;
  comma: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const { t } = useSettings();
  const pay = payFor(plot, stones, diamonds);
  const rate = formatStones(plot.perDay, comma);

  return (
    <section className="city__card" aria-label={t(plot.titleKey)}>
      <h2 className="city__name">{t(plot.titleKey)}</h2>
      <p className="city__rate">
        {owned ? t("mapMining") : t("mapWill")} {rate} {t("mapRate")}
      </p>
      {owned || plot.stone <= 0 ? null : (
        <>
          <p className="city__price">
            <ResourceIcon kind="stone" size={18} />
            <span>{formatStones(plot.stone, comma)}</span>
            <span className="city__or">{t("mapOr")}</span>
            <ResourceIcon kind="diamond" size={18} />
            <span>{plot.diamond}</span>
          </p>
          {pay === "poor" ? <p className="city__need">{t("mapNeed")}</p> : null}
          {pay === "diamond" ? <p className="city__need">{t("mapStoneShortfall")}</p> : null}
          <button type="button" className="city__buy" disabled={busy || pay === "poor"} onClick={onBuy}>
            {t("mapBuy")}
            <ResourceIcon kind={pay === "diamond" ? "diamond" : "stone"} size={18} />
            <span>{pay === "diamond" ? plot.diamond : formatStones(plot.stone, comma)}</span>
          </button>
        </>
      )}
    </section>
  );
}
