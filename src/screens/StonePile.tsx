import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import type { StoneKind } from "../game/levels";
import {
  OX,
  OY,
  PIXEL,
  STONE_OUTLINE,
  VIEW_H,
  VIEW_W,
  buildStone,
  edgeCopy,
  takeChunk,
  takePieces,
  type StonePixel,
} from "./stoneSprite";

type ChipBit = {
  dx: number;
  dy: number;
  color: string;
};

type Chip = {
  bits: ChipBit[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
};

type StonePileProps = {
  kind: StoneKind;
  pieceCount: number;
  power: number;
  shaking: boolean;
  onMine: (event: MouseEvent<HTMLButtonElement>) => void;
  onBreak: () => void;
  children?: ReactNode;
};

const NEIGHBORS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function centroid(pixels: StonePixel[]): { x: number; y: number } {
  if (pixels.length === 0) {
    return { x: 36, y: 30 };
  }
  let x = 0;
  let y = 0;
  for (const pixel of pixels) {
    x += pixel.x;
    y += pixel.y;
  }
  return { x: x / pixels.length, y: y / pixels.length };
}

function toChip(removed: StonePixel[], origin: { x: number; y: number }, hard: boolean): Chip {
  const center = centroid(removed);
  const ox = Math.round(center.x);
  const oy = Math.round(center.y);
  let dirx = center.x - origin.x;
  let diry = center.y - origin.y;
  const len = Math.hypot(dirx, diry) || 1;
  dirx /= len;
  diry /= len;
  const speed = hard ? 2.8 : 2.2;
  return {
    bits: removed.map((pixel) => ({
      dx: pixel.x - ox,
      dy: pixel.y - oy,
      color: pixel.color,
    })),
    x: (OX + ox + 0.5) * PIXEL,
    y: (OY + oy + 0.5) * PIXEL,
    vx: dirx * speed + (Math.random() - 0.5) * 0.8,
    vy: -1.6 - Math.random() * 0.8,
    rot: 0,
    vr: (Math.random() - 0.5) * (hard ? 0.18 : 0.1),
    life: hard ? 36 : 32,
  };
}

function crumbs(removed: StonePixel[], origin: { x: number; y: number }): Chip[] {
  const center = centroid(removed);
  let dirx = center.x - origin.x;
  let diry = center.y - origin.y;
  const len = Math.hypot(dirx, diry) || 1;
  dirx /= len;
  diry /= len;
  const bits: Chip[] = [];
  const count = Math.min(6, removed.length);
  for (let i = 0; i < count; i += 1) {
    const sample = removed[i % removed.length];
    bits.push({
      bits: [{ dx: 0, dy: 0, color: sample.color }],
      x: (OX + sample.x + 0.5) * PIXEL,
      y: (OY + sample.y + 0.5) * PIXEL,
      vx: dirx * (2 + Math.random() * 2.4) + (Math.random() - 0.5) * 1.6,
      vy: -2.2 - Math.random() * 1.4,
      rot: 0,
      vr: (Math.random() - 0.5) * 0.2,
      life: 18 + Math.floor(Math.random() * 8),
    });
  }
  return bits;
}

function blit(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  rot: number,
  color: string,
  originX: number,
  originY: number,
) {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  const px = Math.round((originX + rx * PIXEL - PIXEL / 2) / PIXEL) * PIXEL;
  const py = Math.round((originY + ry * PIXEL - PIXEL / 2) / PIXEL) * PIXEL;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, PIXEL, PIXEL);
}

function drawChip(ctx: CanvasRenderingContext2D, chip: Chip) {
  const fade = chip.life < 10 ? chip.life / 10 : 1;
  ctx.globalAlpha = fade;
  const occupied = new Set(chip.bits.map((bit) => `${bit.dx},${bit.dy}`));
  for (const bit of chip.bits) {
    for (const [dx, dy] of NEIGHBORS) {
      if (occupied.has(`${bit.dx + dx},${bit.dy + dy}`)) {
        continue;
      }
      blit(ctx, bit.dx + dx, bit.dy + dy, chip.rot, STONE_OUTLINE, chip.x, chip.y);
    }
  }
  for (const bit of chip.bits) {
    blit(ctx, bit.dx, bit.dy, chip.rot, bit.color, chip.x, chip.y);
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx: CanvasRenderingContext2D, body: StonePixel[]) {
  if (body.length === 0) {
    return;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let base = -Infinity;
  for (const pixel of body) {
    minX = Math.min(minX, pixel.x);
    maxX = Math.max(maxX, pixel.x);
    base = Math.max(base, pixel.y);
  }
  const cx = (minX + maxX) / 2;
  const rx = (maxX - minX) / 2 + 3;
  const ry = 3.2;
  const cy = base + 3;
  ctx.fillStyle = "rgba(16, 10, 8, 0.42)";
  for (let y = Math.floor(cy - ry); y <= cy + ry; y += 1) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny > 1) {
        continue;
      }
      ctx.fillRect((OX + x) * PIXEL, (OY + y) * PIXEL, PIXEL, PIXEL);
    }
  }
}

function drawBody(ctx: CanvasRenderingContext2D, body: StonePixel[], shiftY: number) {
  const filled = new Set(body.map((pixel) => `${pixel.x},${pixel.y}`));
  const outline: Array<[number, number]> = [];
  const seen = new Set<string>();
  for (const pixel of body) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = pixel.x + dx;
      const y = pixel.y + dy;
      const key = `${x},${y}`;
      if (filled.has(key) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      outline.push([x, y]);
    }
  }
  ctx.fillStyle = STONE_OUTLINE;
  for (const [x, y] of outline) {
    ctx.fillRect((OX + x) * PIXEL, (OY + y) * PIXEL + shiftY, PIXEL, PIXEL);
  }
  for (const pixel of body) {
    ctx.fillStyle = pixel.color;
    ctx.fillRect((OX + pixel.x) * PIXEL, (OY + pixel.y) * PIXEL + shiftY, PIXEL, PIXEL);
  }
}

export function StonePile({
  kind,
  pieceCount,
  power,
  shaking,
  onMine,
  onBreak,
  children,
}: StonePileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodyRef = useRef<StonePixel[]>([]);
  const initialRef = useRef(1);
  const chipsRef = useRef<Chip[]>([]);
  const breakingRef = useRef(false);
  const shakeRef = useRef(0);
  const hitsRef = useRef(0);
  const debtRef = useRef(0);
  const powerRef = useRef(power);
  const onBreakRef = useRef(onBreak);
  powerRef.current = power;
  onBreakRef.current = onBreak;

  useEffect(() => {
    const pile = buildStone(kind);
    bodyRef.current = pile;
    initialRef.current = Math.max(1, pile.length);
    hitsRef.current = 0;
    debtRef.current = 0;
    breakingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = VIEW_W * PIXEL;
    canvas.height = VIEW_H * PIXEL;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.imageSmoothingEnabled = false;
    let frame = 0;
    const loop = () => {
      const chips = chipsRef.current;
      for (const chip of chips) {
        chip.x += chip.vx;
        chip.y += chip.vy;
        chip.vy += 0.34;
        chip.vx *= 0.99;
        chip.rot += chip.vr;
        chip.life -= 1;
      }
      chipsRef.current = chips.filter((chip) => chip.life > 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const body = bodyRef.current;
      drawGround(ctx, body);
      const shift = performance.now() < shakeRef.current ? PIXEL : 0;
      drawBody(ctx, body, shift);
      for (const chip of chipsRef.current) {
        drawChip(ctx, chip);
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [kind]);

  const spawn = (removed: StonePixel[], origin: { x: number; y: number }, hard: boolean) => {
    if (removed.length === 0) {
      return;
    }
    chipsRef.current.push(toChip(removed, origin, hard));
    if (!hard && removed.length > 8) {
      chipsRef.current.push(...crumbs(removed, origin));
    }
  };

  const shatter = (gx: number, gy: number) => {
    breakingRef.current = true;
    const origin = centroid(bodyRef.current);
    let guard = 0;
    while (bodyRef.current.length > 0 && guard < 18) {
      const seed = bodyRef.current[Math.min(guard, bodyRef.current.length - 1)];
      const aimX = guard === 0 ? gx : seed.x;
      const aimY = guard === 0 ? gy : seed.y;
      const { removed, rest } = takeChunk(
        bodyRef.current,
        aimX,
        aimY,
        Math.min(28, bodyRef.current.length),
      );
      if (removed.length === 0) {
        break;
      }
      bodyRef.current = rest;
      spawn(removed, origin, true);
      guard += 1;
    }
    bodyRef.current = [];
    window.setTimeout(() => {
      onBreakRef.current();
    }, 420);
  };

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    const canvas = canvasRef.current;
    if (canvas && !breakingRef.current) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const gx = ((event.clientX - rect.left) * scaleX) / PIXEL - OX;
      const gy = ((event.clientY - rect.top) * scaleY) / PIXEL - OY;
      const powerNow = Math.max(0.1, powerRef.current);
      const nextHits = hitsRef.current + powerNow;
      hitsRef.current = nextHits;
      shakeRef.current = performance.now() + 70;
      if (nextHits >= pieceCount - 1e-6) {
        shatter(gx, gy);
      } else {
        const share = initialRef.current / Math.max(1, pieceCount);
        debtRef.current += share * powerNow;
        const removeNow = Math.floor(debtRef.current);
        debtRef.current -= removeNow;
        if (removeNow <= 0) {
          const speck = edgeCopy(bodyRef.current, gx, gy);
          if (speck) {
            spawn([speck], centroid(bodyRef.current), false);
          }
        } else {
          const bite = takePieces(bodyRef.current, gx, gy, removeNow);
          bodyRef.current = bite.rest;
          const origin = centroid(bite.rest.length > 0 ? bite.rest : bite.removed);
          spawn(bite.removed, origin, false);
        }
      }
    }
    onMine(event);
  };

  return (
    <button
      type="button"
      className={shaking ? "mine__block mine__block--hit" : "mine__block"}
      onClick={onClick}
      aria-label="stone"
    >
      <canvas ref={canvasRef} className="mine__canvas" />
      {children}
    </button>
  );
}
