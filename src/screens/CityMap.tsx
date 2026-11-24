import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import { FOG_REV, renderCloudFog, renderIsland } from "./cloudFog";
import "./CityMap.css";

const MIN_SCALE = 0.8;
const MAX_SCALE = 3.6;
const DRAG_SLOP = 8;

type LiveView = { x: number; y: number; scale: number };

type PayKind = "stone" | "diamond" | "poor";

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

type CityMapProps = {
  stoneIndex: number;
  stones: number;
  diamonds: number;
  onBuy: (stonePrice: number, diamondPrice: number) => PayKind;
  onClose: () => void;
};

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
  const openKey = openPlots.map((plot) => plot.id).join(".");
  const artRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const plotsRef = useRef(openPlots);
  plotsRef.current = openPlots;
  const [fogUrl, setFogUrl] = useState<string | null>(null);
  const [islandUrl, setIslandUrl] = useState<string | null>(null);
  const [view, setView] = useState<LiveView>({ x: 0, y: 0, scale: 1 });
  const live = useRef<LiveView>(view);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const gesture = useRef({
    mode: "none" as "none" | "pan" | "pinch",
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startDist: 1,
    startScale: 1,
    worldX: 0,
    worldY: 0,
  });

  const commit = (next: LiveView) => {
    const node = viewRef.current;
    const sheet = sheetRef.current;
    const scale = clampScale(next.scale);
    let x = next.x;
    let y = next.y;
    if (node && sheet) {
      const sw = sheet.offsetWidth * scale;
      const sh = sheet.offsetHeight * scale;
      const maxX = Math.max(node.clientWidth * 0.28, (sw - node.clientWidth) / 2 + 24);
      const maxY = Math.max(node.clientHeight * 0.28, (sh - node.clientHeight) / 2 + 24);
      x = Math.min(maxX, Math.max(-maxX, x));
      y = Math.min(maxY, Math.max(-maxY, y));
    }
    const clamped = { x, y, scale };
    live.current = clamped;
    setView(clamped);
  };

  const focusOf = (clientX: number, clientY: number) => {
    const rect = viewRef.current?.getBoundingClientRect();
    if (!rect) {
      return { fx: 0, fy: 0 };
    }
    return {
      fx: clientX - (rect.left + rect.width / 2),
      fy: clientY - (rect.top + rect.height / 2),
    };
  };

  const beginPinch = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) {
      return;
    }
    const mx = (pts[0].x + pts[1].x) / 2;
    const my = (pts[0].y + pts[1].y) / 2;
    const { fx, fy } = focusOf(mx, my);
    const current = live.current;
    gesture.current = {
      mode: "pinch",
      startX: 0,
      startY: 0,
      startPanX: current.x,
      startPanY: current.y,
      startDist: Math.max(16, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
      startScale: current.scale,
      worldX: (fx - current.x) / current.scale,
      worldY: (fy - current.y) / current.scale,
    };
    dragged.current = true;
    const node = viewRef.current;
    if (!node) {
      return;
    }
    for (const id of pointers.current.keys()) {
      try {
        node.setPointerCapture(id);
      } catch {
        // The pointer is already gone.
      }
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.size === 0) {
      dragged.current = false;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }
    gesture.current = {
      mode: "pan",
      startX: event.clientX,
      startY: event.clientY,
      startPanX: live.current.x,
      startPanY: live.current.y,
      startDist: 1,
      startScale: live.current.scale,
      worldX: 0,
      worldY: 0,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointers.current.get(event.pointerId);
    if (!point) {
      return;
    }
    point.x = event.clientX;
    point.y = event.clientY;
    if (gesture.current.mode === "pinch" && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const mx = (pts[0].x + pts[1].x) / 2;
      const my = (pts[0].y + pts[1].y) / 2;
      const dist = Math.max(16, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const scale = clampScale(gesture.current.startScale * (dist / gesture.current.startDist));
      const { fx, fy } = focusOf(mx, my);
      commit({
        scale,
        x: fx - gesture.current.worldX * scale,
        y: fy - gesture.current.worldY * scale,
      });
      return;
    }
    if (gesture.current.mode !== "pan") {
      return;
    }
    const dx = event.clientX - gesture.current.startX;
    const dy = event.clientY - gesture.current.startY;
    if (Math.hypot(dx, dy) < DRAG_SLOP && !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    dragged.current = true;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Drag still follows the pointer without capture.
      }
    }
    commit({
      scale: live.current.scale,
      x: gesture.current.startPanX + dx,
      y: gesture.current.startPanY + dy,
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Capture was already released.
      }
    }
    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }
    if (pointers.current.size === 1) {
      const only = [...pointers.current.values()][0];
      gesture.current = {
        mode: "pan",
        startX: only.x,
        startY: only.y,
        startPanX: live.current.x,
        startPanY: live.current.y,
        startDist: 1,
        startScale: live.current.scale,
        worldX: 0,
        worldY: 0,
      };
      return;
    }
    gesture.current.mode = "none";
  };

  useEffect(() => {
    const node = viewRef.current;
    if (!node) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      try {
        event.preventDefault();
      } catch {
        // A passive listener cannot cancel the wheel.
      }
      const factor = Math.exp(-event.deltaY * 0.0014);
      const current = live.current;
      const scale = clampScale(current.scale * factor);
      const { fx, fy } = focusOf(event.clientX, event.clientY);
      const worldX = (fx - current.x) / current.scale;
      const worldY = (fy - current.y) / current.scale;
      commit({ scale, x: fx - worldX * scale, y: fy - worldY * scale });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const img = artRef.current;
    if (!img) {
      return;
    }
    let cancel = false;
    const paint = () => {
      if (cancel || !artRef.current) {
        return;
      }
      const island = renderIsland(artRef.current);
      if (!cancel && island) {
        setIslandUrl(island);
      }
      if (fogGone) {
        return;
      }
      const url = renderCloudFog(artRef.current, plotsRef.current);
      if (!cancel && url) {
        setFogUrl(url);
      }
    };
    if (img.complete && img.naturalWidth > 0) {
      paint();
    } else {
      img.addEventListener("load", paint);
    }
    return () => {
      cancel = true;
      img.removeEventListener("load", paint);
    };
  }, [fogGone, openKey, FOG_REV]);

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

  const ready = Boolean(islandUrl) && (fogGone || Boolean(fogUrl));

  return (
    <div
      ref={viewRef}
      className="city"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(event) => {
        if (!dragged.current) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        dragged.current = false;
      }}
    >
      <div
        ref={sheetRef}
        className="city__sheet"
        data-ready={ready ? "1" : "0"}
        style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
      >
        <img ref={artRef} className="city__source" src="/map/village.jpg" alt="" />
        <img
          className={ready ? "city__art" : "city__art city__art--wait"}
          src={islandUrl ?? "/map/village.jpg"}
          alt=""
          draggable={false}
        />
        {fogUrl ? (
          <img className="city__fog" src={fogUrl} alt="" draggable={false} />
        ) : null}
        <div className="city__pins">
          {openPlots.map((plot) => {
            const mine = owned.includes(plot.id);
            const on = selectedId === plot.id;
            return (
              <button
                key={plot.id}
                type="button"
                className={on ? "city__pin city__pin--on" : "city__pin"}
                style={{ left: `${plot.x}%`, top: `${plot.y}%`, zIndex: on ? 4 : 2 }}
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
