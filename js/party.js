/** DQ風パーティ追尾 — 移動履歴から遅延ステップで追従 */

/** @typedef {'up'|'down'|'left'|'right'} Dir */
/** @typedef {{ tx: number, ty: number, dir: Dir }} TrailStep */
/** @typedef {{ history: TrailStep[], facing: Dir }} PartyTrail */

/** リョウ：マッチョの3歩後（旧1歩の3倍） */
export const RYO_LAG = 3;
/** みいこ：マッチョの6歩後（旧2歩の3倍） */
export const MIIKO_LAG = 6;
/** ウリボウ：みいこの3歩後 */
export const URIBOU_LAG = MIIKO_LAG + 3;

const MAX_HISTORY = 120;

function backOffset(facing, steps = 1) {
  const v = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[facing] || [0, 1];
  return { dx: v[0] * steps, dy: v[1] * steps };
}

/** 初期隊列 — 向きの逆方向に MIIKO_LAG 分の履歴を敷く */
export function createPartyTrail(heroX, heroY, facing = 'down') {
  /** @type {TrailStep[]} */
  const history = [];
  for (let i = MIIKO_LAG; i >= 0; i--) {
    const b = backOffset(facing, i);
    history.push({ tx: heroX + b.dx, ty: heroY + b.dy, dir: facing });
  }
  return { facing, history };
}

/** @param {PartyTrail} trail */
function trimHistory(trail) {
  if (trail.history.length > MAX_HISTORY) {
    trail.history = trail.history.slice(-MAX_HISTORY);
  }
}

/** マッチョが1マス進んだ */
export function recordLeaderStep(trail, toX, toY, dir) {
  trail.facing = dir;
  const last = trail.history[trail.history.length - 1];
  if (last.tx === toX && last.ty === toY) return;
  trail.history.push({ tx: toX, ty: toY, dir });
  trimHistory(trail);
}

/** ドア・ワープ後に隊列を組み直す */
export function reseedTrail(trail, heroX, heroY, facing) {
  const fresh = createPartyTrail(heroX, heroY, facing);
  trail.history = fresh.history;
  trail.facing = facing;
}

/** @param {PartyTrail} trail */
function stepAt(trail, fromEnd) {
  const lag = Math.min(fromEnd, trail.history.length - 1);
  const i = trail.history.length - 1 - lag;
  return trail.history[Math.max(0, i)];
}

/** @param {PartyTrail} trail */
export function heroPos(trail) {
  return stepAt(trail, 0);
}

/** @param {PartyTrail} trail */
export function partyMembers(trail) {
  const miiko = stepAt(trail, MIIKO_LAG);
  const ryo = stepAt(trail, RYO_LAG);
  const hero = stepAt(trail, 0);
  return [
    { key: 'miiko', tx: miiko.tx, ty: miiko.ty, dir: miiko.dir },
    { key: 'ryo', tx: ryo.tx, ty: ryo.ty, dir: ryo.dir },
    { key: 'hero', tx: hero.tx, ty: hero.ty, dir: hero.dir, isHero: true },
  ];
}

export function getFacing(trail) {
  return trail.facing;
}

/** @param {PartyTrail} trail */
export function trailStepAt(trail, lagSteps) {
  return stepAt(trail, lagSteps);
}
