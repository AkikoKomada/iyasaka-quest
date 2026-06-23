/** オープニング — 酒場シーン */

import { W, H } from './render.js?v=20250623d';
import { getSprite, DISPLAY_W, DISPLAY_H } from './sprites.js?v=20250623d';

/** @typedef {'black'|'tavern'} OpeningBg */
/** @typedef {'normal'|'cheer'|null} OpeningChars */
/** @typedef {'none'|'glow'|'cheer'} OpeningEffect */

/**
 * @typedef {Object} OpeningStep
 * @property {OpeningBg} bg
 * @property {OpeningChars} chars
 * @property {string} speaker
 * @property {string} text
 * @property {OpeningEffect} [effect]
 * @property {boolean} [titleCard]
 */

/** @type {OpeningStep[]} */
export const OPENING_STEPS = [
  { bg: 'black', chars: null, speaker: '', text: 'これは、' },
  { bg: 'black', chars: null, speaker: '', text: 'まだ講演会になる前の話。' },
  {
    bg: 'tavern',
    chars: 'normal',
    speaker: '',
    text: '10x未来共鳴セッションで一緒に活動した、\nマッチョ・リョウ・みいこ。',
  },
  {
    bg: 'tavern',
    chars: 'normal',
    speaker: '',
    text: 'その日の打ち上げで、\nまだ誰も知らない小さな種が生まれた。',
  },
  {
    bg: 'tavern',
    chars: 'normal',
    speaker: 'マッチョ',
    text: 'なあ、\n3人でなんか講演会してみようよ！',
    effect: 'glow',
  },
  { bg: 'tavern', chars: 'normal', speaker: 'リョウ', text: 'いいねいいね！' },
  {
    bg: 'tavern',
    chars: 'normal',
    speaker: 'みいこ',
    text: 'いいねいいね！\nそれ、楽しそう！',
  },
  {
    bg: 'tavern',
    chars: 'normal',
    speaker: '',
    text: '冗談みたいなひと言に、\nふたりの声が重なった。',
  },
  { bg: 'tavern', chars: 'cheer', speaker: 'みいこ', text: 'じゃあ、いくよーー！', effect: 'glow' },
  { bg: 'tavern', chars: 'cheer', speaker: 'みいこ', text: 'いやさかーー！！', effect: 'cheer' },
  {
    bg: 'tavern',
    chars: 'cheer',
    speaker: '',
    text: 'その声は、\nただの乾杯ではなかった。',
    effect: 'cheer',
  },
  {
    bg: 'tavern',
    chars: 'cheer',
    speaker: '',
    text: '祝福のように、\n未来へ向かって飛んでいった。',
    effect: 'cheer',
  },
  {
    bg: 'tavern',
    chars: 'normal',
    speaker: '',
    text: 'あの日の「やってみよう」は、\nやがて、ひとつの道になる。',
  },
  {
    bg: 'tavern',
    chars: 'normal',
    speaker: '',
    text: '応援が集まるほど、\nその道は少しずつ開いていく。',
  },
  {
    bg: 'black',
    chars: null,
    speaker: '',
    text: 'これは、\n3人の想いが、\nみんなの応援で実現していく物語。',
  },
  { bg: 'black', chars: null, speaker: '', text: '', titleCard: true },
];

const CHAR_LAYOUT = {
  normal: { ryo: 0.32, hero: 0.5, miiko: 0.68 },
  cheer: { ryo: 0.38, hero: 0.5, miiko: 0.62 },
};

/** 酒場シーンのキャラ足元Y（上方向へオフセット） */
const CHAR_FOOT_Y = H * 0.78 - 16;

let tavernImg = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadOpeningAssets() {
  if (!tavernImg) {
    tavernImg = await loadImage('assets/opening-tavern.png');
  }
}

export function getOpeningStepCount() {
  return OPENING_STEPS.length;
}

/** @param {number} index */
export function getOpeningStep(index) {
  return OPENING_STEPS[index] ?? null;
}

/** @param {CanvasRenderingContext2D} ctx */
function drawBg(ctx, bg) {
  if (bg === 'black' || !tavernImg) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.imageSmoothingEnabled = true;
  const scale = Math.max(W / tavernImg.width, H / tavernImg.height);
  const dw = tavernImg.width * scale;
  const dh = tavernImg.height * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.drawImage(tavernImg, dx, dy, dw, dh);
}

/** @param {CanvasRenderingContext2D} ctx */
function drawChar(ctx, key, cx, footY) {
  const spr = getSprite(key);
  if (!spr) return;
  const x = cx - DISPLAY_W / 2;
  const y = footY - DISPLAY_H;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, x, y, DISPLAY_W, DISPLAY_H);
}

/** @param {CanvasRenderingContext2D} ctx @param {OpeningChars} layout */
function drawParty(ctx, layout) {
  if (!layout) return;
  const pos = CHAR_LAYOUT[layout];
  const footY = CHAR_FOOT_Y;
  drawChar(ctx, 'ryo', W * pos.ryo, footY);
  drawChar(ctx, 'hero', W * pos.hero, footY);
  drawChar(ctx, 'miiko', W * pos.miiko, footY);
}

/** @param {CanvasRenderingContext2D} ctx @param {OpeningEffect} effect @param {number} frame */
function drawEffects(ctx, effect, frame) {
  if (effect === 'none') return;
  const cx = W * 0.5;
  const cy = H * 0.72;
  const pulse = effect === 'cheer' ? 0.55 + Math.sin(frame * 0.12) * 0.2 : 0.35 + Math.sin(frame * 0.08) * 0.12;
  const radius = effect === 'cheer' ? W * 0.42 * pulse : W * 0.18 * pulse;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, effect === 'cheer' ? 'rgba(255,240,160,0.55)' : 'rgba(255,220,120,0.45)');
  g.addColorStop(0.5, 'rgba(255,200,80,0.15)');
  g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (effect !== 'cheer') return;
  ctx.fillStyle = '#fff8d0';
  for (let i = 0; i < 18; i++) {
    const t = frame * 0.04 + i * 1.7;
    const sx = cx + Math.cos(t) * (30 + (i % 5) * 14);
    const sy = cy - 20 - (frame * 0.6 + i * 11) % (H * 0.45);
    if (Math.sin(t * 2 + i) > 0) {
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} stepIndex
 * @param {number} frame
 */
export function drawOpening(ctx, stepIndex, frame) {
  const step = getOpeningStep(stepIndex);
  if (!step) return;

  drawBg(ctx, step.bg);
  drawParty(ctx, step.chars);
  drawEffects(ctx, step.effect || 'none', frame);

  if (step.titleCard) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8d830';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('異矢世界QUEST', W / 2, H / 2 - 8);
    ctx.fillStyle = '#c8d8f0';
    ctx.font = '11px monospace';
    ctx.fillText('〜 異矢世界（いやさかい）講演会への道 〜', W / 2, H / 2 + 18);
  }
}
