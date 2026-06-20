/** スプライト — 参考ドット絵PNG → 48px表示（16pxグリッドは維持） */

export const DISPLAY_W = 48;
export const DISPLAY_H = 48;

const cache = new Map();
let ready = false;

const OUTLINE_COLOR = '#0c0818';

const PNG_MAP = {
  hero: 'assets/chars/macho.png',
  murabito: 'assets/chars/murabito_a.png',
  elder: 'assets/chars/murabito_b.png',
  akiko: 'assets/chars/akiko.png',
  miiko: 'assets/chars/miiko.png',
  ryo: 'assets/chars/ryo.png',
  kochan: 'assets/chars/kochan.png',
  pig: 'assets/chars/uribou.png',
  traveler: 'assets/chars/traveler.png',
};

/** 表示倍率（省略時 1） */
const PNG_SCALE = {
  pig: 0.5,
};

function hexRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** 1px輪郭（4方向のみ） */
function addOutline(ctx, w, h, color) {
  const src = ctx.getImageData(0, 0, w, h);
  const [r, g, b] = hexRgb(color);
  const out = new Uint8ClampedArray(src.data);
  const a = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return src.data[(y * w + x) * 4 + 3];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) > 0) continue;
      const edge = a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1);
      if (!edge) continue;
      const i = (y * w + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

function isOpaque(a) {
  return a > 8;
}

function findBounds(imgData, w, h) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  const d = imgData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isOpaque(d[i + 3])) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function processPng(img, scaleMul = 1) {
  const scratch = document.createElement('canvas');
  scratch.width = img.width;
  scratch.height = img.height;
  const sctx = scratch.getContext('2d');
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.drawImage(img, 0, 0);

  const imgData = sctx.getImageData(0, 0, img.width, img.height);
  const bounds = findBounds(imgData, img.width, img.height);
  if (!bounds) return scratch;

  const out = document.createElement('canvas');
  out.width = DISPLAY_W;
  out.height = DISPLAY_H;
  const ctx = out.getContext('2d');
  ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);

  const scale = ((DISPLAY_H - 6) / bounds.h) * scaleMul;
  const dw = Math.round(bounds.w * scale);
  const dh = Math.round(bounds.h * scale);
  const dx = Math.round((DISPLAY_W - dw) / 2);
  const dy = DISPLAY_H - dh - 2;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    scratch,
    bounds.minX, bounds.minY, bounds.w, bounds.h,
    dx, dy, dw, dh
  );
  addOutline(ctx, DISPLAY_W, DISPLAY_H, OUTLINE_COLOR);
  return out;
}

/** 看板・告知板 — プロシージャル */
function drawProceduralGrid(grid) {
  const LOGICAL = 16;
  const PIXEL = 3;
  const SIZE = LOGICAL * PIXEL;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d');

  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      const col = grid[y]?.[x];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
    }
  }
  addOutline(ctx, SIZE, SIZE, OUTLINE_COLOR);

  const bounds = findBounds(ctx.getImageData(0, 0, SIZE, SIZE), SIZE, SIZE);
  const out = document.createElement('canvas');
  out.width = DISPLAY_W;
  out.height = DISPLAY_H;
  const octx = out.getContext('2d');
  octx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);
  octx.imageSmoothingEnabled = false;

  if (bounds) {
    const scale = (DISPLAY_H - 6) / bounds.h;
    const dw = Math.round(bounds.w * scale);
    const dh = Math.round(bounds.h * scale);
    const dx = Math.round((DISPLAY_W - dw) / 2);
    const dy = DISPLAY_H - dh - 2;
    octx.drawImage(
      c,
      bounds.minX, bounds.minY, bounds.w, bounds.h,
      dx, dy, dw, dh
    );
  } else {
    octx.drawImage(c, 0, 0, SIZE, SIZE, 0, 0, DISPLAY_W, DISPLAY_H);
  }
  return out;
}

const SIGN_GRID = (() => {
  const rows = [
    '................',
    '.......w........',
    '.......w........',
    '....ssssss......',
    '....swwwws......',
    '....swwwws......',
    '....swwwws......',
    '....ssssss......',
    '.......w........',
    '.......w........',
    '.......w........',
    '.......w........',
    '.......w........',
    '................',
    '................',
    '................',
  ];
  const pal = { w: '#684018', s: '#e8b858' };
  return rows.map((r) => [...r].map((ch) => (ch === '.' ? '' : pal[ch] || '')));
})();

/** 告知の丘 — 大きな掲示板 */
const BOARD_GRID = (() => {
  const rows = [
    '................',
    '.......ww.......',
    '.......ww.......',
    '....ssssssss....',
    '....swwwwwws....',
    '....swwwwwws....',
    '....swwwwwws....',
    '....swwwwwws....',
    '....ssssssss....',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '................',
    '................',
    '................',
    '................',
  ];
  const pal = { w: '#684018', s: '#e8b858' };
  return rows.map((r) => [...r].map((ch) => (ch === '.' ? '' : pal[ch] || '')));
})();

let iyasakaVideoImg = null;

export async function loadSprites() {
  await Promise.all(
    Object.entries(PNG_MAP).map(async ([key, path]) => {
      if (cache.has(key)) return;
      const img = await loadImage(path);
      cache.set(key, processPng(img, PNG_SCALE[key] ?? 1));
    })
  );
  cache.set('sign', drawProceduralGrid(SIGN_GRID));
  cache.set('board', drawProceduralGrid(BOARD_GRID));
  iyasakaVideoImg = await loadImage('assets/items/iyasaka-video.jpg');
  ready = true;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function spritesReady() {
  return ready;
}

export function getSprite(key) {
  return cache.get(key) || cache.get('murabito');
}

export function getIyasakaVideo() {
  return iyasakaVideoImg;
}

/** いやさかのどうがサムネイル描画 */
export function drawIyasakaVideo(ctx, x, y, w, h) {
  const img = iyasakaVideoImg;
  if (!img) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
}

export function spriteDrawPos(tx, ty, camX, camY, tileSize, bob = 0) {
  const footX = tx * tileSize - camX + tileSize / 2;
  const footY = ty * tileSize - camY + tileSize;
  return {
    x: Math.round(footX - DISPLAY_W / 2),
    y: Math.round(footY - DISPLAY_H + bob),
  };
}

export function drawTile(ctx, tileId, dx, dy, frame = 0, tx = 0, ty = 0) {
  const px = Math.round(dx);
  const py = Math.round(dy);
  const t = { 0: '#58a838', 1: '#c89858', 2: '#3888d8', 3: '#287818', 4: '#886848', 5: '#684828', 6: '#b89878', 7: '#689848', 8: '#a0a0a0', 9: '#d0c090' };
  const base = t[tileId] ?? '#000';
  ctx.fillStyle = base;
  ctx.fillRect(px, py, 16, 16);

  if (tileId === 0) {
    // 世界座標で模様を固定（歩行中のカメラ移動でちらつかない）
    ctx.fillStyle = (tx + ty) % 2 === 0 ? '#62b040' : base;
    ctx.fillRect(px, py, 16, 16);
  }
  if (tileId === 1) {
    ctx.fillStyle = '#b08848';
    for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 4, py + (i % 2) * 4, 3, 3);
  }
  if (tileId === 2) {
    ctx.fillStyle = '#58b0f0';
    const flow = Math.floor(frame / 28);
    const waveA = (tx * 5 + ty * 3 + flow) % 12;
    const waveB = (tx * 5 + ty * 3 + flow + 6) % 12;
    ctx.fillRect(px + waveA, py + 4, 4, 2);
    ctx.fillRect(px + waveB, py + 10, 4, 2);
  }
  if (tileId === 3) {
    ctx.fillStyle = '#684828';
    ctx.fillRect(px + 6, py + 10, 4, 6);
    ctx.fillStyle = '#38a828';
    ctx.beginPath();
    ctx.arc(px + 8, py + 6, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (tileId === 4) {
    ctx.fillStyle = '#705838';
    ctx.fillRect(px, py, 16, 3);
    ctx.fillStyle = '#987858';
    ctx.fillRect(px + 2, py + 3, 4, 4);
    ctx.fillRect(px + 10, py + 3, 4, 4);
  }
  if (tileId === 5) {
    ctx.fillStyle = '#503018';
    ctx.fillRect(px + 4, py + 2, 8, 14);
    ctx.fillStyle = '#806040';
    ctx.fillRect(px + 6, py + 6, 2, 2);
  }
  if (tileId === 7) {
    ctx.fillStyle = '#489838';
    ctx.beginPath();
    ctx.arc(px + 8, py + 10, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (tileId === 9) {
    ctx.fillStyle = '#987848';
    ctx.fillRect(px, py + 12, 16, 4);
  }
}
