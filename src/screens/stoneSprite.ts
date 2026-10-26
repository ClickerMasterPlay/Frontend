import type { StoneKind } from "../game/levels";

export type StonePixel = {
  x: number;
  y: number;
  color: string;
};

export const PIXEL = 6;
export const VIEW_W = 84;
export const VIEW_H = 68;
export const OX = 6;
export const OY = 6;

const W = 72;
const H = 56;

type Tone = readonly [string, string, string, string];

type Rock = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  colors: Tone;
};

const GRAY: Tone = ["#2f2b28", "#6a635b", "#b1a79a", "#f3eadc"];
const COOL: Tone = ["#24302e", "#4e6560", "#8eaea4", "#e3f2ea"];
const DEEP: Tone = ["#1e1a17", "#4a433c", "#8a7f72", "#d9cbb8"];
const LIT: Tone = ["#3a342c", "#7d7264", "#cbbba6", "#fff6e8"];

const OUTLINE = "#140e0c";
const SEAM = "#241c16";
const MOSS = ["#23441c", "#3f7a32", "#86b84e"] as const;
const GRASS = "#3f8a34";
const GRASS_TIP = "#c6e86e";

type Grid = (string | null)[][];

function hash(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return (n ^ (n >> 16)) >>> 0;
}

function emptyGrid(): Grid {
  return Array.from({ length: H }, () => Array<string | null>(W).fill(null));
}

function dist(x: number, y: number, rock: Rock): number {
  const nx = (x + 0.5 - rock.cx) / rock.rx;
  const ny = (y + 0.5 - rock.cy) / rock.ry;
  return Math.abs(nx) ** 2.2 + Math.abs(ny) ** 2.2;
}

function inside(x: number, y: number, rock: Rock): boolean {
  const d = dist(x, y, rock);
  if (d > 1.08) {
    return false;
  }
  if (d < 0.78) {
    return true;
  }
  return hash(x, y) % 5 !== 0;
}

function shade(x: number, y: number, rock: Rock): string {
  const nx = (x + 0.5 - rock.cx) / rock.rx;
  const ny = (y + 0.5 - rock.cy) / rock.ry;
  const light = -nx * 0.9 - ny * 0.65;
  const [dark, mid, lightC, hi] = rock.colors;
  if (hash(x, y) % 17 === 0 && light < 0.45) {
    return dark;
  }
  if (light > 0.58) {
    return hi;
  }
  if (light > 0.2) {
    return lightC;
  }
  if (light < -0.22) {
    return dark;
  }
  return mid;
}

function paintRock(grid: Grid, rock: Rock, seam: boolean) {
  const x0 = Math.max(0, Math.floor(rock.cx - rock.rx - 2));
  const x1 = Math.min(W - 1, Math.ceil(rock.cx + rock.rx + 2));
  const y0 = Math.max(0, Math.floor(rock.cy - rock.ry - 2));
  const y1 = Math.min(H - 1, Math.ceil(rock.cy + rock.ry + 2));

  if (seam) {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (!grid[y][x]) {
          continue;
        }
        const d = dist(x, y, rock);
        if (d > 1 && d < 1.28) {
          grid[y][x] = SEAM;
        }
      }
    }
  }

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!inside(x, y, rock)) {
        continue;
      }
      const nx = (x + 0.5 - rock.cx) / rock.rx;
      const ny = (y + 0.5 - rock.cy) / rock.ry;
      if (nx > 0.22 && ny > -0.2) {
        grid[y][x] = rock.colors[0];
      } else if (nx < -0.28 && ny < 0.25) {
        grid[y][x] = rock.colors[3];
      } else {
        grid[y][x] = shade(x, y, rock);
      }
    }
  }

  const hx = Math.round(rock.cx - rock.rx * 0.4);
  const hy = Math.round(rock.cy - rock.ry * 0.42);
  if (grid[hy]?.[hx]) {
    grid[hy][hx] = "#f7f3ea";
  }
}

function crack(grid: Grid, x0: number, y0: number, x1: number, y1: number) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps + ((i % 4) - 1) * 0.2);
    if (grid[y]?.[x]) {
      grid[y][x] = "#211c18";
    }
  }
}

function growMoss(grid: Grid) {
  for (let y = 1; y < 32; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      if (!grid[y][x] || grid[y - 1][x]) {
        continue;
      }
      const clump = hash(x >> 1, y >> 1) % 6;
      if (clump === 0) {
        continue;
      }
      grid[y][x] = MOSS[hash(x, y) % MOSS.length];
      if (grid[y + 1]?.[x] && hash(x, y) % 3 !== 0) {
        grid[y + 1][x] = MOSS[0];
      }
    }
  }
}

function plant(grid: Grid, x: number, height: number, lean: number) {
  let y = 0;
  while (y < H && !grid[y][x]) {
    y += 1;
  }
  if (y <= 1 || y >= H) {
    return;
  }
  for (let i = 1; i <= height; i += 1) {
    const px = x + (i > 2 ? lean : 0);
    const py = y - i;
    if (py < 0 || px < 0 || px >= W || grid[py][px]) {
      break;
    }
    grid[py][px] = i === height ? GRASS_TIP : GRASS;
    if (i === height) {
      const lx = px + (lean >= 0 ? 1 : -1);
      if (lx >= 0 && lx < W && grid[py] && !grid[py][lx]) {
        grid[py][lx] = GRASS_TIP;
      }
    }
  }
}

function toPixels(grid: Grid): StonePixel[] {
  const pixels: StonePixel[] = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const color = grid[y][x];
      if (color) {
        pixels.push({ x, y, color });
      }
    }
  }
  return pixels;
}

const ROCKS: Rock[] = [
  { cx: 24, cy: 26, rx: 15, ry: 12, colors: DEEP },
  { cx: 48, cy: 24, rx: 14, ry: 12, colors: COOL },
  { cx: 36, cy: 16, rx: 11, ry: 9, colors: LIT },
  { cx: 14, cy: 36, rx: 11, ry: 9, colors: GRAY },
  { cx: 58, cy: 35, rx: 10, ry: 8, colors: COOL },
  { cx: 36, cy: 38, rx: 15, ry: 11, colors: GRAY },
  { cx: 22, cy: 20, rx: 6, ry: 5, colors: DEEP },
  { cx: 8, cy: 42, rx: 5, ry: 4, colors: GRAY },
  { cx: 64, cy: 42, rx: 5, ry: 4, colors: DEEP },
  { cx: 24, cy: 48, rx: 6, ry: 4, colors: COOL },
  { cx: 48, cy: 48, rx: 6, ry: 4, colors: GRAY },
  { cx: 36, cy: 48, rx: 4, ry: 3, colors: DEEP },
];

export function buildMossyPile(): StonePixel[] {
  const grid = emptyGrid();
  ROCKS.forEach((rock, index) => paintRock(grid, rock, index > 0));
  crack(grid, 16, 22, 30, 32);
  crack(grid, 40, 18, 54, 30);
  crack(grid, 28, 34, 44, 44);
  growMoss(grid);
  plant(grid, 16, 4, -1);
  plant(grid, 28, 5, 0);
  plant(grid, 36, 4, 1);
  plant(grid, 46, 5, 0);
  plant(grid, 58, 3, 1);
  plant(grid, 10, 3, -1);
  plant(grid, 64, 3, 1);
  return toPixels(grid);
}

function put(grid: Grid, x: number, y: number, color: string) {
  if (x < 0 || y < 0 || x >= W || y >= H) {
    return;
  }
  grid[y][x] = color;
}

function fillSpike(
  grid: Grid,
  x: number,
  yTop: number,
  height: number,
  half: number,
  edge: string,
  mid: string,
  core: string,
) {
  for (let i = 0; i < height; i += 1) {
    const y = yTop + i;
    const width = Math.max(0, Math.round((half * i) / Math.max(1, height - 1)));
    for (let dx = -width; dx <= width; dx += 1) {
      const ratio = width === 0 ? 0 : Math.abs(dx) / width;
      const color = ratio > 0.72 ? edge : ratio > 0.34 ? mid : core;
      put(grid, x + dx, y, color);
    }
  }
}

function buildFromRocks(rocks: Rock[], decorate: (grid: Grid) => void): StonePixel[] {
  const grid = emptyGrid();
  rocks.forEach((rock, index) => paintRock(grid, rock, index > 0));
  decorate(grid);
  return toPixels(grid);
}

const LAVA: Tone = ["#140806", "#3a120e", "#7a2414", "#ff6a32"];
const GOLD: Tone = ["#5a3a08", "#c48a12", "#ffd24a", "#fff3b0"];
const SAND: Tone = ["#8a4e22", "#c47a3a", "#e6b15a", "#ffe0a4"];
const SHELL: Tone = ["#24180e", "#4a3420", "#6a4c2c", "#8a6840"];

function buildLava(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 36, cy: 14, rx: 7, ry: 8, colors: LAVA },
      { cx: 20, cy: 28, rx: 14, ry: 16, colors: LAVA },
      { cx: 48, cy: 26, rx: 15, ry: 17, colors: LAVA },
      { cx: 34, cy: 40, rx: 16, ry: 12, colors: LAVA },
    ],
    (grid) => {
      crack(grid, 18, 20, 32, 44);
      crack(grid, 30, 12, 40, 46);
      crack(grid, 44, 16, 56, 42);
      for (let i = 0; i < 18; i += 1) {
        const x = 22 + (i % 6) * 5;
        const y = 16 + (i % 5) * 6;
        if (grid[y]?.[x]) {
          grid[y][x] = i % 2 === 0 ? "#ffd15a" : "#ff3b14";
        }
      }
    },
  );
}

function buildGold(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 36, cy: 30, rx: 22, ry: 18, colors: SHELL },
      { cx: 30, cy: 28, rx: 9, ry: 8, colors: GOLD },
      { cx: 42, cy: 32, rx: 8, ry: 7, colors: GOLD },
      { cx: 36, cy: 24, rx: 5, ry: 4, colors: GOLD },
    ],
    (grid) => {
      crack(grid, 16, 22, 28, 34);
      crack(grid, 46, 20, 58, 36);
      put(grid, 34, 26, "#fff8d0");
      put(grid, 40, 30, "#fff8d0");
    },
  );
}

function buildDune(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 36, cy: 22, rx: 24, ry: 6, colors: SAND },
      { cx: 28, cy: 32, rx: 22, ry: 7, colors: SAND },
      { cx: 44, cy: 40, rx: 20, ry: 6, colors: SAND },
      { cx: 18, cy: 44, rx: 10, ry: 4, colors: SAND },
    ],
    (grid) => {
      for (let i = 0; i < 14; i += 1) {
        put(grid, 58, 40 - i, i % 3 === 0 ? "#8ee07a" : "#2f8f3c");
        put(grid, 59, 40 - i, "#1f6a2c");
      }
      put(grid, 55, 32, "#8ee07a");
      put(grid, 54, 32, "#2f8f3c");
      put(grid, 54, 31, "#8ee07a");
      put(grid, 62, 34, "#8ee07a");
      put(grid, 63, 34, "#2f8f3c");
      put(grid, 63, 33, "#8ee07a");
    },
  );
}

function buildCrystal(): StonePixel[] {
  const grid = emptyGrid();
  fillSpike(grid, 36, 6, 34, 10, "#0c2f86", "#2f8bff", "#e9fbff");
  fillSpike(grid, 18, 16, 28, 8, "#12306a", "#49c2ff", "#f4fdff");
  fillSpike(grid, 54, 14, 30, 8, "#0a2460", "#7a5cff", "#f7f2ff");
  fillSpike(grid, 28, 24, 22, 6, "#14508a", "#7ee7ff", "#ffffff");
  fillSpike(grid, 46, 22, 24, 6, "#1a3f9a", "#5ad0ff", "#ffffff");
  return toPixels(grid);
}

const ICE: Tone = ["#2d6d96", "#7ec4e8", "#d7f3ff", "#ffffff"];
const SNOW: Tone = ["#8ec4dc", "#e7f6ff", "#ffffff", "#ffffff"];
const RUBBLE: Tone = ["#3a342c", "#8a7a66", "#cbb89a", "#f3e6d0"];
const RUBBLE_MOSS: Tone = ["#2a3428", "#5c6b50", "#8d9a78", "#d5e0c4"];
const WET: Tone = ["#101614", "#24342c", "#3c5648", "#6d8c78"];
const SLATE: Tone = ["#242a36", "#46546c", "#7d8ca4", "#d5deea"];
const RESIN: Tone = ["#8a4a0c", "#e07a18", "#ffc14a", "#fff1b8"];

function capTops(grid: Grid, color: string, second: string) {
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      if (!grid[y][x] || grid[y - 1][x]) {
        continue;
      }
      grid[y][x] = color;
      if (grid[y + 1][x] && hash(x, y) % 2 === 0) {
        grid[y + 1][x] = second;
      }
    }
  }
}

function hang(grid: Grid, x: number, y: number, length: number, color: string) {
  for (let i = 1; i <= length; i += 1) {
    if (grid[y + i]?.[x]) {
      break;
    }
    put(grid, x, y + i, color);
  }
}

function fern(grid: Grid, x: number, height: number) {
  let surface = 0;
  while (surface < H && !grid[surface][x]) {
    surface += 1;
  }
  if (surface <= 1 || surface >= H) {
    return;
  }
  for (let i = 1; i <= height; i += 1) {
    put(grid, x, surface - i, i === height ? "#dff7a4" : "#3f9a34");
    if (i > 2 && i % 2 === 0) {
      const lean = i % 4 === 0 ? -1 : 1;
      put(grid, x + lean, surface - i, "#b6e86a");
      put(grid, x + lean * 2, surface - i, "#7dce55");
    }
  }
}

function mushroom(grid: Grid, x: number, radius: number, color: string, spot: string) {
  let surface = 0;
  while (surface < H && !grid[surface][x]) {
    surface += 1;
  }
  if (surface >= H) {
    return;
  }
  for (let i = 1; i <= 5; i += 1) {
    put(grid, x, surface - i, "#f4e4c8");
    put(grid, x + 1, surface - i, "#e4d0ae");
  }
  const capY = surface - 6;
  for (let dy = -radius; dy <= 1; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = dx / radius;
      const ny = dy / Math.max(1, radius * 0.65);
      if (nx * nx + ny * ny > 1 || dy > 1) {
        continue;
      }
      put(grid, x + dx, capY + dy, hash(x + dx, capY + dy) % 4 === 0 ? spot : color);
    }
  }
}

function buildIce(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 36, cy: 24, rx: 14, ry: 12, colors: SNOW },
      { cx: 18, cy: 32, rx: 11, ry: 10, colors: ICE },
      { cx: 54, cy: 30, rx: 11, ry: 10, colors: ICE },
      { cx: 32, cy: 40, rx: 12, ry: 8, colors: ICE },
      { cx: 48, cy: 42, rx: 8, ry: 6, colors: SNOW },
      { cx: 14, cy: 44, rx: 5, ry: 4, colors: ICE },
    ],
    (grid) => {
      capTops(grid, "#ffffff", "#e7f7ff");
      hang(grid, 22, 40, 3, "#d7f4ff");
      hang(grid, 40, 46, 3, "#ffffff");
      hang(grid, 56, 38, 2, "#b7e8ff");
    },
  );
}

function buildRuin(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 28, cy: 22, rx: 13, ry: 11, colors: RUBBLE },
      { cx: 48, cy: 24, rx: 12, ry: 11, colors: RUBBLE_MOSS },
      { cx: 36, cy: 36, rx: 15, ry: 11, colors: RUBBLE },
      { cx: 14, cy: 38, rx: 8, ry: 7, colors: RUBBLE_MOSS },
      { cx: 58, cy: 40, rx: 7, ry: 6, colors: RUBBLE },
      { cx: 24, cy: 46, rx: 5, ry: 4, colors: RUBBLE },
    ],
    (grid) => {
      crack(grid, 22, 18, 34, 32);
      crack(grid, 42, 20, 52, 34);
      capTops(grid, "#6f9a48", "#2f4a28");
      put(grid, 34, 34, "#4a4034");
      put(grid, 36, 36, "#4a4034");
      put(grid, 38, 34, "#4a4034");
      put(grid, 36, 32, "#d7c27a");
      fern(grid, 18, 6);
    },
  );
}

function buildBloom(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 24, cy: 28, rx: 12, ry: 11, colors: GRAY },
      { cx: 46, cy: 26, rx: 13, ry: 12, colors: DEEP },
      { cx: 34, cy: 40, rx: 16, ry: 10, colors: GRAY },
      { cx: 16, cy: 42, rx: 7, ry: 6, colors: COOL },
      { cx: 56, cy: 40, rx: 7, ry: 6, colors: DEEP },
    ],
    (grid) => {
      crack(grid, 20, 24, 32, 38);
      crack(grid, 40, 22, 52, 36);
      mushroom(grid, 20, 5, "#e23b4a", "#fff4ea");
      mushroom(grid, 48, 5, "#7a4ad4", "#f4ecff");
      mushroom(grid, 34, 4, "#f0a030", "#fff6d8");
    },
  );
}

function buildFern(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 30, cy: 20, rx: 12, ry: 10, colors: WET },
      { cx: 50, cy: 22, rx: 11, ry: 10, colors: WET },
      { cx: 22, cy: 34, rx: 12, ry: 11, colors: WET },
      { cx: 44, cy: 36, rx: 14, ry: 12, colors: WET },
      { cx: 60, cy: 40, rx: 6, ry: 5, colors: WET },
      { cx: 12, cy: 42, rx: 5, ry: 4, colors: WET },
    ],
    (grid) => {
      crack(grid, 24, 16, 36, 32);
      crack(grid, 42, 28, 54, 42);
      capTops(grid, "#1c4e28", "#7fbe58");
      fern(grid, 16, 9);
      fern(grid, 34, 8);
      fern(grid, 52, 9);
      fern(grid, 58, 7);
    },
  );
}

function buildAmber(): StonePixel[] {
  return buildFromRocks(
    [
      { cx: 22, cy: 28, rx: 12, ry: 12, colors: SLATE },
      { cx: 48, cy: 26, rx: 13, ry: 12, colors: SLATE },
      { cx: 36, cy: 38, rx: 14, ry: 10, colors: SLATE },
      { cx: 36, cy: 30, rx: 7, ry: 6, colors: RESIN },
      { cx: 14, cy: 42, rx: 5, ry: 4, colors: SLATE },
      { cx: 58, cy: 40, rx: 6, ry: 5, colors: SLATE },
    ],
    (grid) => {
      crack(grid, 28, 24, 40, 36);
      put(grid, 34, 28, "#fff6c8");
      put(grid, 38, 32, "#fff6c8");
      put(grid, 20, 40, "#c45a28");
      put(grid, 21, 39, "#e7a04a");
      put(grid, 52, 42, "#c45a28");
      put(grid, 53, 41, "#6f9a48");
      fern(grid, 58, 6);
    },
  );
}

export function buildStone(kind: StoneKind): StonePixel[] {
  switch (kind) {
    case "lava":
      return buildLava();
    case "crystal":
      return buildCrystal();
    case "dune":
      return buildDune();
    case "ice":
      return buildIce();
    case "gold":
      return buildGold();
    case "ruin":
      return buildRuin();
    case "bloom":
      return buildBloom();
    case "fern":
      return buildFern();
    case "amber":
      return buildAmber();
    default:
      return buildMossyPile();
  }
}

export const STONE_OUTLINE = OUTLINE;

const NEIGHBORS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function takeBite(
  body: StonePixel[],
  gx: number,
  gy: number,
  radius = 7,
): { removed: StonePixel[]; rest: StonePixel[] } {
  if (body.length === 0) {
    return { removed: [], rest: body };
  }

  let cx = 0;
  let cy = 0;
  for (const pixel of body) {
    cx += pixel.x;
    cy += pixel.y;
  }
  cx /= body.length;
  cy /= body.length;

  let dirx = gx - cx;
  let diry = gy - cy;
  const len = Math.hypot(dirx, diry);
  if (len < 8) {
    dirx = body.length % 2 === 0 ? 0.65 : -0.65;
    diry = -0.76;
  } else {
    dirx /= len;
    diry /= len;
  }

  let edge = body[0];
  let best = Number.NEGATIVE_INFINITY;
  for (const pixel of body) {
    const proj = (pixel.x - cx) * dirx + (pixel.y - cy) * diry;
    if (proj > best) {
      best = proj;
      edge = pixel;
    }
  }

  const biteX = edge.x + dirx * radius * 0.2;
  const biteY = edge.y + diry * radius * 0.2;
  const reach = radius * radius;
  const removed = body.filter((pixel) => {
    const dx = pixel.x - biteX;
    const dy = pixel.y - biteY;
    return dx * dx + dy * dy <= reach;
  });
  const gone = new Set(removed.map((pixel) => `${pixel.x},${pixel.y}`));
  return {
    removed,
    rest: body.filter((pixel) => !gone.has(`${pixel.x},${pixel.y}`)),
  };
}

export function takePieces(
  body: StonePixel[],
  gx: number,
  gy: number,
  count: number,
): { removed: StonePixel[]; rest: StonePixel[] } {
  if (body.length === 0 || count <= 0) {
    return { removed: [], rest: body };
  }
  if (count >= body.length) {
    return { removed: [...body], rest: [] };
  }

  let radius = 0.8;
  let picked = takeBite(body, gx, gy, radius);
  while (picked.removed.length < count && radius < 36) {
    radius += 0.7;
    picked = takeBite(body, gx, gy, radius);
  }
  if (picked.removed.length <= count) {
    return picked;
  }

  let cx = 0;
  let cy = 0;
  for (const pixel of body) {
    cx += pixel.x;
    cy += pixel.y;
  }
  cx /= body.length;
  cy /= body.length;
  const removed = [...picked.removed]
    .sort(
      (a, b) =>
        (b.x - cx) ** 2 + (b.y - cy) ** 2 - ((a.x - cx) ** 2 + (a.y - cy) ** 2),
    )
    .slice(0, count);
  const gone = new Set(removed.map((pixel) => `${pixel.x},${pixel.y}`));
  return {
    removed,
    rest: body.filter((pixel) => !gone.has(`${pixel.x},${pixel.y}`)),
  };
}

export function edgeCopy(body: StonePixel[], gx: number, gy: number): StonePixel | null {
  const bite = takeBite(body, gx, gy, 1.2);
  const pixel = bite.removed[0];
  return pixel ? { ...pixel } : null;
}

export function takeChunk(
  body: StonePixel[],
  gx: number,
  gy: number,
  count: number,
): { removed: StonePixel[]; rest: StonePixel[] } {
  if (body.length === 0 || count <= 0) {
    return { removed: [], rest: body };
  }

  const index = new Map<string, StonePixel>();
  let cx = 0;
  let cy = 0;
  for (const pixel of body) {
    index.set(`${pixel.x},${pixel.y}`, pixel);
    cx += pixel.x;
    cy += pixel.y;
  }
  cx /= body.length;
  cy /= body.length;

  let seed = body[0];
  let best = Number.POSITIVE_INFINITY;
  for (const pixel of body) {
    const exposed = NEIGHBORS.some(([dx, dy]) => !index.has(`${pixel.x + dx},${pixel.y + dy}`));
    if (!exposed) {
      continue;
    }
    const distToClick = (pixel.x - gx) ** 2 + (pixel.y - gy) ** 2;
    const outward = (pixel.x - cx) * (gx - cx) + (pixel.y - cy) * (gy - cy);
    const score = distToClick - outward * 0.35;
    if (score < best) {
      best = score;
      seed = pixel;
    }
  }

  const removed: StonePixel[] = [];
  const seen = new Set<string>([`${seed.x},${seed.y}`]);
  const queue = [seed];
  while (queue.length > 0 && removed.length < count) {
    const pixel = queue.shift();
    if (!pixel) {
      break;
    }
    removed.push(pixel);
    for (const [dx, dy] of NEIGHBORS) {
      const key = `${pixel.x + dx},${pixel.y + dy}`;
      if (seen.has(key)) {
        continue;
      }
      const next = index.get(key);
      if (!next) {
        continue;
      }
      seen.add(key);
      queue.push(next);
    }
  }

  const gone = new Set(removed.map((pixel) => `${pixel.x},${pixel.y}`));
  return {
    removed,
    rest: body.filter((pixel) => !gone.has(`${pixel.x},${pixel.y}`)),
  };
}
