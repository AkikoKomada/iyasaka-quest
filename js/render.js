import { TILE, VW, VH, tileAt, HILL_BOARD_TX, HILL_BOARD_TY } from './tiles.js?v=20250623d';
import { getSprite, drawTile, spriteDrawPos, DISPLAY_W, DISPLAY_H, drawIyasakaVideo, getIyasakaVideo } from './sprites.js?v=20250623d';
import { npcsOnMap, getFlags } from './world.js?v=20250623d';
import { partyMembers, trailStepAt, URIBOU_LAG } from './party.js?v=20250623d';

export const W = VW * TILE;
export const H = VH * TILE;

function isDesktopUi() {
  return typeof matchMedia !== 'undefined'
    && matchMedia('(min-width: 901px) and (hover: hover)').matches;
}

const TITLE_PAD = 16;

/** @param {CanvasRenderingContext2D} ctx */
function fitFontSize(ctx, text, maxW, startSize, minSize, weight = '') {
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `${weight}${size}px monospace`;
    if (ctx.measureText(text).width <= maxW) return size;
    size -= 1;
  }
  return minSize;
}

/** @param {CanvasRenderingContext2D} ctx */
function wrapLines(ctx, text, maxW) {
  /** @type {string[]} */
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** @param {CanvasRenderingContext2D} ctx */
function truncateToWidth(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxW) {
    out = out.slice(0, -1);
  }
  return out.length < text.length ? `${out}…` : out;
}

/** タイル隙間（縦線）防止 — カメラを整数pxにスナップ */
export function snapCam(camX, camY) {
  return { cx: Math.round(camX), cy: Math.round(camY) };
}

/** @param {{ tx: number, ty: number }} from @param {{ tx: number, ty: number }} to */
export function dirToward(from, to) {
  const dx = to.tx - from.tx;
  const dy = to.ty - from.ty;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  if (dy !== 0) return dy > 0 ? 'down' : 'up';
  return 'down';
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawMap(ctx, map, camX, camY, frame) {
  const { cx, cy } = snapCam(camX, camY);
  const startX = Math.floor(cx / TILE);
  const startY = Math.floor(cy / TILE);
  const endX = startX + VW + 2;
  const endY = startY + VH + 2;

  for (let ty = startY; ty < endY; ty++) {
    for (let tx = startX; tx < endX; tx++) {
      const id = tileAt(map, tx, ty);
      const dx = tx * TILE - cx;
      const dy = ty * TILE - cy;
      if (dx > -TILE && dy > -TILE && dx < W && dy < H) {
        drawTile(ctx, id, dx, dy, frame, tx, ty);
      }
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawEntity(ctx, spriteKey, tx, ty, camX, camY, opts = {}) {
  const { isHero = false, dir = 'down', bob = 0 } = opts;
  const { cx, cy } = snapCam(camX, camY);
  const spr = getSprite(spriteKey);
  if (!spr) return;
  const { x, y } = spriteDrawPos(tx, ty, cx, cy, TILE, bob);

  if (isHero) {
    ctx.fillStyle = 'rgba(255,220,80,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + DISPLAY_W / 2, y + DISPLAY_H - 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(x + DISPLAY_W / 2, y);
  if (dir === 'left') ctx.scale(-1, 1);
  ctx.drawImage(spr, -DISPLAY_W / 2, 0, DISPLAY_W, DISPLAY_H);
  ctx.restore();
}

/** @param {import('./party.js').PartyTrail} trail */
export function drawEntities(ctx, mapName, camX, camY, trail, opts = {}) {
  const { moveAnim = null, talkFacing = null } = opts;

  /** @type {{ key: string, tx: number, ty: number, isHero?: boolean, dir: string, sortY: number, bob: number }[]} */
  const queue = npcsOnMap(mapName).map((n) => {
    let npcDir = 'down';
    if (talkFacing && talkFacing.npcId === n.id) npcDir = talkFacing.npcDir;
    return { key: n.sprite, tx: n.x, ty: n.y, dir: npcDir, sortY: n.y, bob: 0 };
  });

  const partyDir = talkFacing ? talkFacing.partyDir : null;
  let members = partyMembers(trail);

  if (moveAnim && moveAnim.t < 1) {
    members = moveAnim.prev.map((p, i) => {
      const n = moveAnim.next[i];
      const t = moveAnim.t;
      // 1歩につき1回のゆったりした hop（0→上→0）
      const walkBob = -Math.sin(t * Math.PI) * 2.5;
      return {
        key: p.key,
        tx: p.tx + (n.tx - p.tx) * t,
        ty: p.ty + (n.ty - p.ty) * t,
        dir: n.dir,
        isHero: p.isHero,
        bob: walkBob,
      };
    });
  }

  for (const m of members) {
    queue.push({
      key: m.key,
      tx: m.tx,
      ty: m.ty,
      dir: partyDir || m.dir,
      isHero: m.isHero,
      sortY: m.ty,
      bob: m.bob || 0,
    });
  }

  const f = getFlags();
  if (f.uribouFollows && mapName !== 'indoor') {
    const u = trailStepAt(trail, URIBOU_LAG);
    queue.push({
      key: 'pig',
      tx: u.tx,
      ty: u.ty,
      dir: u.dir,
      sortY: u.ty,
      bob: 0,
    });
  }

  queue.sort((a, b) => a.sortY - b.sortY || a.tx - b.tx);

  for (const e of queue) {
    drawEntity(ctx, e.key, e.tx, e.ty, camX, camY, {
      isHero: e.isHero,
      dir: e.dir,
      bob: e.bob,
    });
  }
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawTitle(ctx, title, subtitle, frame) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2040a0');
  g.addColorStop(1, '#102040');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 47 + frame) % W;
    const sy = (i * 31) % (H / 2);
    if ((frame + i) % 60 < 30) ctx.fillRect(sx, sy, 1, 1);
  }

  ctx.textAlign = 'center';
  const maxW = W - TITLE_PAD * 2;
  const desk = isDesktopUi();

  ctx.fillStyle = '#f8d830';
  const titleSize = fitFontSize(ctx, title, maxW, desk ? 22 : 18, desk ? 14 : 12, 'bold ');
  ctx.font = `bold ${titleSize}px monospace`;
  ctx.fillText(title, W / 2, H / 2 - (desk ? 22 : 18));

  ctx.fillStyle = '#e8f0ff';
  let subSize = desk ? 11 : 9;
  const subMin = desk ? 8 : 7;
  /** @type {string[]} */
  let subLines = [];
  while (subSize >= subMin) {
    ctx.font = `${subSize}px monospace`;
    subLines = wrapLines(ctx, subtitle, maxW);
    if (subLines.length <= 2) break;
    subSize -= 1;
  }
  ctx.font = `${subSize}px monospace`;
  subLines = wrapLines(ctx, subtitle, maxW);
  const lineH = subSize + 3;
  const subY = H / 2 + 2;
  subLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, subY + i * lineH);
  });

  ctx.fillStyle = '#8090c0';
  const promptSize = fitFontSize(ctx, '▼  ENTER で はじめる', maxW, desk ? 12 : 10, 8);
  ctx.font = `${promptSize}px monospace`;
  if (Math.floor(frame / 30) % 2 === 0) {
    ctx.fillText('▼  ENTER で はじめる', W / 2, H - 24);
  }
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawMapOverlay(ctx, mapName, camX, camY) {
  if (mapName !== 'hill') return;
  const f = getFlags();
  const { cx, cy } = snapCam(camX, camY);
  const spr = getSprite('board');
  const { x, y } = spriteDrawPos(HILL_BOARD_TX, HILL_BOARD_TY, cx, cy, TILE, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, x, y, DISPLAY_W, DISPLAY_H);

  if (f.postedAtHill && getIyasakaVideo()) {
    const px = HILL_BOARD_TX * TILE - cx;
    const py = HILL_BOARD_TY * TILE - cy;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px - 1, py - 22, 18, 12);
    drawIyasakaVideo(ctx, px, py - 21, 16, 10);
  }
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawStatus(ctx, mapName, flags) {
  const desk = isDesktopUi();
  const barH = desk ? 18 : 14;
  const baseY = desk ? 14 : 10;
  const pad = 4;
  ctx.fillStyle = 'rgba(0,0,20,0.55)';
  ctx.fillRect(0, 0, W, barH);
  ctx.font = desk ? '12px monospace' : '9px monospace';

  let rightText = '';
  let rightMode = 'none';
  if (flags.supporters?.length) {
    rightText = `応援 ${flags.supporters.length}人`;
    rightMode = 'text';
  } else if (flags.hasVideo && getIyasakaVideo()) {
    rightMode = 'video';
  } else if (flags.hasVideo) {
    rightText = 'いやさかのどうが';
    rightMode = 'text';
  }

  let rightReserve = pad;
  if (rightMode === 'video') {
    rightReserve = (desk ? 42 : 36) + pad;
  } else if (rightText) {
    ctx.fillStyle = flags.supporters?.length ? '#90e8a0' : '#f8d830';
    rightReserve = ctx.measureText(rightText).width + pad * 2;
  }

  const places = { outdoor: 'どうがむら', indoor: 'アキコの家', hill: '告知の丘' };
  const place = places[mapName] ?? mapName;
  const fullLeft = flags.supporters?.length
    ? place
    : `${place}  マッチョ・リョウ・みいこ`;
  const maxLeftW = Math.max(40, W - rightReserve - pad);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#a0b8e0';
  ctx.fillText(truncateToWidth(ctx, fullLeft, maxLeftW), pad, baseY);

  ctx.textAlign = 'right';
  if (rightMode === 'video') {
    drawIyasakaVideo(ctx, W - (desk ? 42 : 36), 1, desk ? 38 : 32, desk ? 14 : 12);
  } else if (rightText) {
    ctx.fillStyle = flags.supporters?.length ? '#90e8a0' : '#f8d830';
    ctx.fillText(rightText, W - pad, baseY);
  }
}

export function cameraForPlayer(map, tx, ty) {
  let cx = tx * TILE - W / 2 + TILE / 2;
  let cy = ty * TILE - H / 2 + TILE / 2;
  cx = Math.max(0, Math.min(map.w * TILE - W, cx));
  cy = Math.max(0, Math.min(map.h * TILE - H, cy));
  return { cx, cy };
}

export function facingOffset(dir) {
  return { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir] || [0, 1];
}
