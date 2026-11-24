const W = 384;
const H = 288;
const BLOCK = 2;

export const FOG_REV = 4;

type RGB = [number, number, number];

type PlotSpot = {
  id: string;
  x: number;
  y: number;
};

type Lobe = {
  x: number;
  y: number;
  rx: number;
  ry: number;
};

const HI: RGB = [255, 253, 246];
const BODY: RGB = [252, 241, 214];
const SHADE: RGB = [210, 184, 142];
const DEEP: RGB = [176, 150, 112];

let landMask: Uint8Array | null = null;
let islandUrl: string | null = null;
const fogCache = new Map<string, string>();

function isPaper(r: number, g: number, b: number): boolean {
  return r > 232 && g > 214 && b > 176 && Math.abs(r - g) < 36 && r - b < 70;
}

function hash(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function onLand(land: Uint8Array, x: number, y: number): boolean {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) {
    return false;
  }
  return land[iy * W + ix] === 1;
}

function lobeSits(land: Uint8Array, x: number, y: number, rx: number, ry: number): boolean {
  if (!onLand(land, x, y)) {
    return false;
  }
  let hits = 0;
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    if (onLand(land, x + Math.cos(angle) * rx * 0.38, y + Math.sin(angle) * ry * 0.38)) {
      hits += 1;
    }
  }
  return hits >= 5;
}

function cleared(x: number, y: number, plots: readonly PlotSpot[]): boolean {
  const px = (x / W) * 100;
  const py = (y / H) * 100;
  for (let i = 0; i < plots.length; i += 1) {
    const plot = plots[i];
    const dx = px - plot.x;
    const dy = py - plot.y;
    const angle = Math.atan2(dy, dx);
    const wobble =
      0.88 +
      0.16 * Math.sin(angle * 3 + plot.x * 0.17) +
      0.1 * Math.sin(angle * 5.2 + plot.y * 0.13);
    const rx = 13.2 * wobble;
    const ry = 17.4 * wobble;
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
      return true;
    }
  }
  return false;
}

function stamp(
  data: Uint8ClampedArray,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: RGB,
  band: "all" | "top" | "belly" | "deep",
) {
  const y0 = Math.max(0, Math.floor((cy - ry) / BLOCK) * BLOCK);
  const y1 = Math.min(H - BLOCK, Math.ceil(cy + ry));
  const x0 = Math.max(0, Math.floor((cx - rx) / BLOCK) * BLOCK);
  const x1 = Math.min(W - BLOCK, Math.ceil(cx + rx));
  for (let y = y0; y <= y1; y += BLOCK) {
    const dy = (y + BLOCK * 0.5 - cy) / ry;
    if (band === "top" && dy > -0.02) {
      continue;
    }
    if (band === "belly" && dy < 0.18) {
      continue;
    }
    if (band === "deep" && dy < 0.48) {
      continue;
    }
    for (let x = x0; x <= x1; x += BLOCK) {
      const dx = (x + BLOCK * 0.5 - cx) / rx;
      const edge = 0.9 + 0.14 * hash(x >> 2, y >> 2);
      if (dx * dx + dy * dy > edge) {
        continue;
      }
      for (let oy = 0; oy < BLOCK; oy += 1) {
        for (let ox = 0; ox < BLOCK; ox += 1) {
          const px = x + ox;
          const py = y + oy;
          if (px >= W || py >= H) {
            continue;
          }
          const i = (py * W + px) * 4;
          data[i] = color[0];
          data[i + 1] = color[1];
          data[i + 2] = color[2];
          data[i + 3] = 255;
        }
      }
    }
  }
}

function ensureLand(img: HTMLImageElement): Uint8Array {
  if (landMask) {
    return landMask;
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return new Uint8Array(W * H);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, W, H);
  const pixels = ctx.getImageData(0, 0, W, H).data;
  const land = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    land[i] = isPaper(r, g, b) ? 0 : 1;
  }
  landMask = land;
  return land;
}

function scatter(
  land: Uint8Array,
  plots: readonly PlotSpot[],
  lobes: Lobe[],
  rand: () => number,
  stepX: number,
  stepY: number,
  rMin: number,
  rMax: number,
  countMin: number,
  countMax: number,
) {
  const rows = Math.ceil((H + stepY * 2) / stepY);
  for (let row = -1; row <= rows; row += 1) {
    const gy = row * stepY;
    const shift = row % 2 === 0 ? 0 : stepX * 0.5;
    for (let gx = -stepX; gx <= W + stepX; gx += stepX) {
      const cx = gx + shift + (rand() - 0.5) * stepX * 0.42;
      const cy = gy + (rand() - 0.5) * stepY * 0.36;
      const count = countMin + Math.floor(rand() * (countMax - countMin + 1));
      const spread = rMin * 0.42;
      for (let n = 0; n < count; n += 1) {
        const angle = rand() * Math.PI * 2;
        const dist = rand() * spread;
        const radius = rMin + rand() * (rMax - rMin);
        const x = Math.round((cx + Math.cos(angle) * dist) / BLOCK) * BLOCK;
        const y = Math.round((cy + Math.sin(angle) * dist * 0.7) / BLOCK) * BLOCK;
        const rx = Math.round(radius * (1.08 + rand() * 0.16) / BLOCK) * BLOCK;
        const ry = Math.round(radius * (0.78 + rand() * 0.1) / BLOCK) * BLOCK;
        if (!lobeSits(land, x, y, rx, ry) || cleared(x, y, plots)) {
          continue;
        }
        lobes.push({ x, y, rx, ry });
      }
    }
  }
}

function paint(land: Uint8Array, plots: readonly PlotSpot[]): string {
  const rand = mulberry32(0xc10d5);
  const lobes: Lobe[] = [];
  scatter(land, plots, lobes, rand, 32, 26, 18, 26, 3, 4);
  lobes.sort((a, b) => a.y - b.y || a.x - b.x);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  const image = ctx.createImageData(W, H);
  const data = image.data;
  for (let i = 0; i < lobes.length; i += 1) {
    const lobe = lobes[i];
    stamp(data, lobe.x, lobe.y, lobe.rx, lobe.ry, BODY, "all");
    stamp(data, lobe.x, lobe.y + lobe.ry * 0.06, lobe.rx * 0.98, lobe.ry, SHADE, "belly");
    stamp(data, lobe.x + lobe.rx * 0.04, lobe.y + lobe.ry * 0.1, lobe.rx * 0.9, lobe.ry * 0.92, DEEP, "deep");
    stamp(data, lobe.x - lobe.rx * 0.1, lobe.y - lobe.ry * 0.16, lobe.rx * 0.62, lobe.ry * 0.55, HI, "top");
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export function renderIsland(img: HTMLImageElement): string {
  if (islandUrl) {
    return islandUrl;
  }
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return "";
  }
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  const paper = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const base = i * 4;
    if (isPaper(pixels[base], pixels[base + 1], pixels[base + 2])) {
      paper[i] = 1;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const base = i * 4;
      if (paper[i]) {
        pixels[base + 3] = 0;
        continue;
      }
      const r = pixels[base];
      const g = pixels[base + 1];
      const b = pixels[base + 2];
      const pale = r > 196 && g > 176 && b > 130 && g < r + 18 && r - b < 100;
      if (!pale) {
        continue;
      }
      let near = false;
      for (let oy = -2; oy <= 2 && !near; oy += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          if (paper[ny * width + nx]) {
            near = true;
            break;
          }
        }
      }
      if (near) {
        pixels[base + 3] = 0;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  islandUrl = canvas.toDataURL("image/png");
  return islandUrl;
}

export function renderCloudFog(img: HTMLImageElement, plots: readonly PlotSpot[]): string {
  const key = `${FOG_REV}:${plots.map((plot) => plot.id).join(".")}`;
  const cached = fogCache.get(key);
  if (cached) {
    return cached;
  }
  const url = paint(ensureLand(img), plots);
  if (url) {
    fogCache.set(key, url);
  }
  return url;
}
