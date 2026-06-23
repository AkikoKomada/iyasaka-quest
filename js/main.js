import {
  W, H, drawMap, drawMapOverlay, drawEntities, drawTitle, drawStatus, cameraForPlayer,
  facingOffset, dirToward, snapCam,
} from './render.js?v=20250623c';
import { DISPLAY_H } from './sprites.js?v=20250623c';
import { TILE, getMap, isWalkable, tileAt } from './tiles.js?v=20250623c';
import {
  WORLD, npcsOnMap, getNpcLines, markTalked, findDoor, findMapExit,
  findInteractable, getInteractableLines, getFlags, setFlag,
  applyFlags, snapshotFlags, setPersistHandler, hasMetVillagers,
} from './world.js?v=20250623c';
import {
  readSave, writeSave, createDefaultSave, hasAllRequiredSupporters,
  isRestorableSave, clearSave,
} from './save.js?v=20250623c';
import { loadSprites } from './sprites.js?v=20250623c';
import {
  createPartyTrail, recordLeaderStep, reseedTrail, heroPos, getFacing, partyMembers,
} from './party.js?v=20250623c';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const msgEl = document.getElementById('msg');
const msgName = document.getElementById('msg-name');
const msgText = document.getElementById('msg-text');
const hint = document.getElementById('hint');
const touchControls = document.getElementById('touch-controls');
const gameFrame = document.getElementById('frame');

function detectTouchDevice() {
  if (navigator.maxTouchPoints > 0) return true;
  if ('ontouchstart' in window) return true;
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

const isTouchDevice = detectTouchDevice();
if (isTouchDevice) document.body.classList.add('is-touch');

/** @typedef {'title'|'intro'|'play'|'dialogue'} State */
/** @type {State} */
let state = 'title';
let frame = 0;

let mapName = 'outdoor';
let trail = createPartyTrail(20, 16, 'down');
let dir = 'down';
let cam = { cx: 0, cy: 0 };

let moveLock = false;
let moveTimer = 0;
/** 1マス移動にかかる時間（ms）— 携帯はキーボードより速め */
const MOVE_MS = isTouchDevice ? 160 : 420;

/** @type {{ prev: ReturnType<typeof partyMembers>, next: ReturnType<typeof partyMembers>, elapsed: number } | null} */
let moveAnim = null;

/** @type {{ partyDir: string, npcId: string, npcDir: string } | null} */
let talkFacing = null;

/** @type {{ npc: import('./world.js').NpcDef, lines: string[], index: number } | null} */
let dialogue = null;
let introIndex = 0;

function heroFromTrail() {
  return heroPos(trail);
}

function persistGame() {
  if (state === 'title') return;
  writeSave({
    v: 1,
    started: state !== 'title',
    state: state === 'dialogue' ? 'play' : state,
    mapName,
    dir,
    introIndex,
    trail: {
      facing: trail.facing,
      history: trail.history.slice(-120),
    },
    flags: snapshotFlags(),
  });
}

function applySave(save) {
  applyFlags(save.flags);
  mapName = save.mapName || 'outdoor';
  dir = save.dir || 'down';
  introIndex = save.introIndex || 0;
  trail.facing = save.trail?.facing || 'down';
  trail.history = Array.isArray(save.trail?.history) && save.trail.history.length
    ? save.trail.history.slice(-120)
    : createPartyTrail(20, 16, 'down').history;
  const hero = heroFromTrail();
  cam = cameraForPlayer(currentMap(), hero.tx, hero.ty);
}

function resetToFreshStart() {
  const fresh = createDefaultSave();
  applySave(fresh);
  state = 'title';
  introIndex = 0;
  dialogue = null;
  talkFacing = null;
  moveLock = false;
  moveAnim = null;
  msgEl.classList.remove('open', 'has-video');
  writeSave(fresh);
}

function restoreFromSave(save) {
  applySave(save);
  moveLock = false;
  moveAnim = null;
  if (save.state === 'title') {
    state = 'title';
    msgEl.classList.remove('open', 'has-video');
    dialogue = null;
    talkFacing = null;
    return;
  }
  if (save.state === 'intro') {
    state = 'intro';
    msgEl.classList.add('open');
    msgName.textContent = '';
    msgText.textContent = WORLD.intro[introIndex] ?? WORLD.intro[0];
    dialogue = null;
    talkFacing = null;
    return;
  }
  state = 'play';
  msgEl.classList.remove('open', 'has-video');
  dialogue = null;
  talkFacing = null;
}

function bootstrapFromSave() {
  const saved = readSave();
  if (saved?.started && isRestorableSave(saved)) {
    restoreFromSave(saved);
    return;
  }
  if (saved?.started) {
    console.warn('[iyasaka-quest] invalid save — resetting to title');
    clearSave();
  }
  resetToFreshStart();
}

setPersistHandler(persistGame);

const keys = { up: false, down: false, left: false, right: false };
let lastConfirmAt = 0;

function currentMap() {
  return getMap(mapName);
}

function setHint(text) {
  hint.textContent = text;
}

function setUiMode() {
  document.body.classList.toggle('is-playing', state === 'play');
  document.body.classList.toggle('is-menu', isMenuState());
  if (touchControls) {
    touchControls.style.display = isTouchDevice && !isMenuState() ? 'grid' : '';
  }
  layoutGame();
}

/** iPhone 向け — 画面サイズに合わせてゲーム枠を再計算 */
function layoutGame() {
  if (!gameFrame) return;
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const landscape = vw > vh;
  const mobile = vw <= 900 || isTouchDevice;

  const chromeH = mobile ? (landscape ? 56 : 280) : 72;
  const sidePad = mobile && landscape ? 200 : 32;

  const availH = Math.max(120, vh - chromeH);
  const availW = Math.max(160, vw - sidePad);

  let h = Math.min(availH, availW * 0.75);
  let w = h * (4 / 3);
  if (w > availW) {
    w = availW;
    h = w * 0.75;
  }

  gameFrame.style.width = `${Math.floor(w)}px`;
  gameFrame.style.height = `${Math.floor(h)}px`;
  gameFrame.style.maxHeight = `${Math.floor(h)}px`;
}

function refreshHint() {
  const tap = isTouchDevice ? 'タップ' : 'クリック';
  setUiMode();
  if (state === 'title') {
    canvas.style.cursor = 'pointer';
    setHint(`${tap} / Enter で はじめる`);
    return;
  }
  if (state === 'intro' || state === 'dialogue') {
    canvas.style.cursor = 'pointer';
    setHint(`${tap} / Enter / Space で つぎへ`);
    return;
  }
  canvas.style.cursor = 'default';
  const f = getFlags();
  const move = isTouchDevice ? '下の矢印' : '↑↓←→';
  if (mapName === 'hill') {
    setHint(`← 西（左）: どうがむらへ もどる　${move} で あるく`);
  } else if (f.chapter2Complete) {
    setHint(`${move} で あるく　第2章クリア！`);
  } else if (f.hasVideo && !f.postedAtHill) {
    setHint(`${move} で あるく　→ 東：告知の丘　看板の前で ${tap}`);
  } else if (f.postedAtHill && !hasAllRequiredSupporters(f.supporters)) {
    setHint(`${move} 応援者を 増やそう（むらびとに 話しかけて）`);
  } else {
    setHint(`${move} で あるく　${tap} で はなす`);
  }
}

function syncMsgVideo() {
  if (!dialogue) {
    msgEl.classList.remove('has-video');
    return;
  }
  const isAkiko = dialogue.npc.id === 'akiko';
  const villagersMet = hasMetVillagers();
  if (isAkiko && villagersMet && dialogue.index >= 2 && !getFlags().hasVideo) {
    setFlag('hasVideo', true);
    setFlag('chapter2Unlocked', true);
  }
  const show = isAkiko && villagersMet && getFlags().hasVideo && dialogue.index >= 2;
  msgEl.classList.toggle('has-video', show);
}

function openDialogue(npc, lines) {
  state = 'dialogue';
  dialogue = { npc, lines, index: 0 };
  if (npc.id !== '_narrator') markTalked(npc.id);

  if (npc.id !== '_narrator' && npc.x != null) {
    const hero = heroPos(trail);
    const partyDir = dirToward(hero, npc);
    const npcDir = dirToward(npc, hero);
    talkFacing = { partyDir, npcId: npc.id, npcDir };
    dir = partyDir;
  } else {
    talkFacing = null;
  }

  msgEl.classList.add('open');
  msgName.textContent = npc.name;
  msgText.textContent = lines[0];
  syncMsgVideo();
  refreshHint();
}

function openNarratorDialogue(lines) {
  openDialogue({ id: '_narrator', name: '' }, lines);
}

function closeDialogue() {
  dialogue = null;
  talkFacing = null;
  msgEl.classList.remove('open', 'has-video');

  state = 'play';
  refreshHint();
  persistGame();
}

function maybeChapter2Intro() {
  const f = getFlags();
  if (f.chapter2Unlocked && !f.chapter2IntroSeen) {
    setFlag('chapter2IntroSeen', true);
    openNarratorDialogue(WORLD.chapter2Intro);
  }
}

function advanceDialogue() {
  if (!dialogue) return;
  if (dialogue.index < dialogue.lines.length - 1) {
    dialogue.index += 1;
    msgText.textContent = dialogue.lines[dialogue.index];
    syncMsgVideo();
    return;
  }
  closeDialogue();
}

function findTalkTarget() {
  const hero = heroPos(trail);
  const [fdx, fdy] = facingOffset(dir);
  const npcs = npcsOnMap(mapName);
  if (!npcs.length) return null;

  /** @type {{ npc: typeof npcs[0], score: number }[]} */
  const ranked = [];

  for (const n of npcs) {
    const dx = n.x - hero.tx;
    const dy = n.y - hero.ty;
    const manhattan = Math.abs(dx) + Math.abs(dy);
    const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
    if (manhattan === 0 || manhattan > 3 || chebyshev > 2) continue;

    const frontBonus = dx * fdx + dy * fdy > 0 ? 0 : 4;
    ranked.push({ npc: n, score: manhattan + frontBonus });
  }

  ranked.sort((a, b) => a.score - b.score);
  return ranked[0]?.npc ?? null;
}

/** クリック位置から NPC を探す（スプライトより広い当たり判定） */
function npcAtClick(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = ((clientX - rect.left) / rect.width) * W;
  const sy = ((clientY - rect.top) / rect.height) * H;
  const viewCam = snapCam(getDisplayCam().cx, getDisplayCam().cy);
  const hitPad = 20;

  let found = null;
  let best = Infinity;

  for (const n of npcsOnMap(mapName)) {
    const cx = n.x * TILE - viewCam.cx + TILE / 2;
    const cy = n.y * TILE - viewCam.cy + TILE - DISPLAY_H / 2;
    if (
      sx >= cx - hitPad &&
      sx <= cx + hitPad &&
      sy >= cy - hitPad &&
      sy <= cy + hitPad
    ) {
      const d = (sx - cx) ** 2 + (sy - cy) ** 2;
      if (d < best) {
        best = d;
        found = n;
      }
    }
  }
  return found;
}

function tryInteractable() {
  const hero = heroPos(trail);
  const [fdx, fdy] = facingOffset(dir);
  const obj = findInteractable(mapName, hero.tx, hero.ty, fdx, fdy);
  if (!obj) return false;
  const lines = getInteractableLines(obj);
  openDialogue(
    { id: obj.id, name: obj.name, x: obj.x, y: obj.y, sprite: 'sign', map: mapName },
    lines
  );
  return true;
}

function tryMapExit() {
  const hero = heroPos(trail);
  const exit = findMapExit(mapName, hero.tx, hero.ty);
  if (!exit) return;
  if (exit.requireHasVideo && !getFlags().hasVideo) return;
  mapName = exit.to;
  reseedTrail(trail, exit.tx, exit.ty, dir);
  cam = cameraForPlayer(currentMap(), heroPos(trail).tx, heroPos(trail).ty);
  refreshHint();
  persistGame();
}

function tryTalk(preferredNpc = null) {
  const npc = preferredNpc || findTalkTarget();
  if (!npc) return;
  const lines = getNpcLines(npc);
  openDialogue(npc, lines);
}

function tryDoor() {
  const hero = heroPos(trail);
  const door = findDoor(mapName, hero.tx, hero.ty);
  if (!door) return;
  const fromIndoor = mapName === 'indoor';
  mapName = door.to;
  reseedTrail(trail, door.tx, door.ty, dir);
  cam = cameraForPlayer(currentMap(), heroPos(trail).tx, heroPos(trail).ty);
  if (fromIndoor && mapName === 'outdoor') {
    setTimeout(maybeChapter2Intro, MOVE_MS);
  }
  persistGame();
}

function tryMove(nx, ny, newDir) {
  if (moveLock || state !== 'play') return;
  dir = newDir;
  const map = currentMap();
  if (!isWalkable(map, nx, ny)) return;
  const blocked = npcsOnMap(mapName).some((n) => n.x === nx && n.y === ny);
  if (blocked) return;

  const prev = partyMembers(trail);
  recordLeaderStep(trail, nx, ny, newDir);
  const next = partyMembers(trail);

  moveLock = true;
  moveTimer = MOVE_MS;
  const camTo = cameraForPlayer(map, heroPos(trail).tx, heroPos(trail).ty);
  moveAnim = {
    prev,
    next,
    elapsed: 0,
    camFrom: { cx: cam.cx, cy: cam.cy },
    camTo,
  };

  if (tileAt(map, nx, ny) === 5) {
    setTimeout(tryDoor, MOVE_MS);
  }
}

function handleInput() {
  if (state === 'title' || state === 'intro' || state === 'dialogue') return;

  const hero = heroPos(trail);
  if (keys.up) tryMove(hero.tx, hero.ty - 1, 'up');
  else if (keys.down) tryMove(hero.tx, hero.ty + 1, 'down');
  else if (keys.left) tryMove(hero.tx - 1, hero.ty, 'left');
  else if (keys.right) tryMove(hero.tx + 1, hero.ty, 'right');
}

function interact() {
  if (state === 'title') {
    state = 'intro';
    introIndex = 0;
    msgEl.classList.add('open');
    msgName.textContent = '';
    msgText.textContent = WORLD.intro[0];
    refreshHint();
    persistGame();
    return;
  }
  if (state === 'intro') {
    if (introIndex < WORLD.intro.length - 1) {
      introIndex += 1;
      msgText.textContent = WORLD.intro[introIndex];
      refreshHint();
      persistGame();
      return;
    }
    msgEl.classList.remove('open');
    state = 'play';
    dir = getFacing(trail);
    cam = cameraForPlayer(currentMap(), heroPos(trail).tx, heroPos(trail).ty);
    refreshHint();
    persistGame();
    return;
  }
  if (state === 'dialogue') {
    advanceDialogue();
    refreshHint();
    return;
  }
  if (state === 'play') {
    if (tryInteractable()) return;
    tryTalk();
  }
}

function getDisplayCam() {
  if (moveAnim?.camFrom && moveAnim?.camTo) {
    const t = Math.min(1, moveAnim.elapsed / MOVE_MS);
    const ease = t * t * (3 - 2 * t);
    return {
      cx: moveAnim.camFrom.cx + (moveAnim.camTo.cx - moveAnim.camFrom.cx) * ease,
      cy: moveAnim.camFrom.cy + (moveAnim.camTo.cy - moveAnim.camFrom.cy) * ease,
    };
  }
  return cam;
}

function update(dt) {
  frame += 1;
  if (moveLock) {
    moveTimer -= dt;
    if (moveAnim) moveAnim.elapsed += dt;
    if (moveTimer <= 0) {
      if (moveAnim?.camTo) cam = moveAnim.camTo;
      moveLock = false;
      moveAnim = null;
      tryMapExit();
      persistGame();
    }
  }
  handleInput();
}

function render() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  if (state === 'title') {
    drawTitle(ctx, WORLD.title, WORLD.subtitle, frame);
    return;
  }

  const map = currentMap();
  const displayCam = getDisplayCam();
  const viewCam = snapCam(displayCam.cx, displayCam.cy);
  drawMap(ctx, map, viewCam.cx, viewCam.cy, frame);
  drawMapOverlay(ctx, mapName, viewCam.cx, viewCam.cy);

  const anim = moveAnim
    ? { prev: moveAnim.prev, next: moveAnim.next, t: Math.min(1, moveAnim.elapsed / MOVE_MS) }
    : null;
  drawEntities(ctx, mapName, viewCam.cx, viewCam.cy, trail, { moveAnim: anim, talkFacing });

  drawStatus(ctx, mapName, getFlags());

  if (state === 'play' && !moveLock) {
    const hero = heroPos(trail);
    const [fx, fy] = facingOffset(dir);
    const px = hero.tx * TILE - viewCam.cx + TILE / 2;
    const py = hero.ty * TILE - viewCam.cy + TILE - 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + fx * 5 - 2, py + fy * 3 - 2, 4, 4);
    ctx.fillStyle = '#ff2838';
    ctx.fillRect(px + fx * 5 - 1, py + fy * 3 - 1, 2, 2);
  }
}

function loop() {
  update(16);
  render();
  requestAnimationFrame(loop);
}

function isConfirmKey(e) {
  if (e.isComposing) return false;
  const k = e.key;
  const c = e.code;
  return (
    k === 'Enter' ||
    k === ' ' ||
    k === 'Spacebar' ||
    k === 'z' ||
    k === 'Z' ||
    c === 'Enter' ||
    c === 'NumpadEnter' ||
    c === 'Space' ||
    e.keyCode === 13 ||
    e.keyCode === 32 ||
    e.which === 13 ||
    e.which === 32
  );
}

function isMenuState() {
  return state === 'title' || state === 'intro' || state === 'dialogue';
}

function onConfirm(e) {
  if (!isConfirmKey(e)) return;
  if (e.type === 'keydown' && e.repeat) return;
  const now = performance.now();
  if (now - lastConfirmAt < 150) return;
  lastConfirmAt = now;
  e.preventDefault();
  e.stopPropagation();
  interact();
}

function onKeyDown(e) {
  if (['ArrowUp', 'w', 'W'].includes(e.key)) {
    keys.up = true;
    e.preventDefault();
  }
  if (['ArrowDown', 's', 'S'].includes(e.key)) {
    keys.down = true;
    e.preventDefault();
  }
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
    keys.left = true;
    e.preventDefault();
  }
  if (['ArrowRight', 'd', 'D'].includes(e.key)) {
    keys.right = true;
    e.preventDefault();
  }
  if (isConfirmKey(e)) onConfirm(e);
}

function onKeyUp(e) {
  if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.up = false;
  if (['ArrowDown', 's', 'S'].includes(e.key)) keys.down = false;
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.left = false;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.right = false;
  // Mac 等で Enter / Space の keydown が取れない場合の保険
  if (isMenuState() && isConfirmKey(e)) onConfirm(e);
}

canvas.width = W;
canvas.height = H;
canvas.tabIndex = -1;

const kbInput = document.getElementById('kb');

function focusGame() {
  kbInput.focus({ preventScroll: true });
}

function isGameKey(e) {
  return (
    isConfirmKey(e) ||
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)
  );
}

function bindKeys() {
  kbInput.addEventListener('keydown', onKeyDown);
  kbInput.addEventListener('keyup', onKeyUp);
  document.addEventListener('keydown', (e) => {
    if (document.activeElement === kbInput) return;
    if (!isGameKey(e)) return;
    focusGame();
    onKeyDown(e);
  }, true);
  document.addEventListener('keyup', (e) => {
    if (document.activeElement === kbInput) return;
    if (!isGameKey(e)) return;
    onKeyUp(e);
  }, true);
}

canvas.addEventListener('click', (e) => {
  focusGame();
  if (isMenuState()) return;
  if (state === 'play') {
    const clicked = npcAtClick(e.clientX, e.clientY);
    if (clicked) {
      tryTalk(clicked);
      return;
    }
    if (tryInteractable()) return;
    interact();
  }
});

function bindTapAdvance() {
  const overlay = document.getElementById('tap-advance');
  if (!overlay) return;
  let lastTapAt = 0;

  function onAdvance(e) {
    if (!isMenuState()) return;
    const now = performance.now();
    if (now - lastTapAt < 180) return;
    lastTapAt = now;
    e.preventDefault();
    e.stopPropagation();
    focusGame();
    interact();
  }

  overlay.addEventListener('touchend', onAdvance, { passive: false });
  overlay.addEventListener('click', onAdvance);
}

gameFrame.addEventListener('pointerdown', () => focusGame());
window.addEventListener('focus', () => focusGame());
bindKeys();

function bindTouchControls() {
  if (!touchControls) return;

  /** @type {Record<string, keyof typeof keys>} */
  const dirMap = { up: 'up', down: 'down', left: 'left', right: 'right' };

  for (const btn of touchControls.querySelectorAll('button[data-dir]')) {
    const dir = btn.getAttribute('data-dir');
    if (!dir || !(dir in dirMap)) continue;
    const key = dirMap[dir];

    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      keys[key] = true;
      btn.classList.add('pressed');
    };
    const release = (e) => {
      e.preventDefault();
      e.stopPropagation();
      keys[key] = false;
      btn.classList.remove('pressed');
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release);
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }
}

/** スワイプでも1マス移動（矢印の代わり） */
function bindSwipeMove() {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  canvas.addEventListener('touchstart', (e) => {
    if (state !== 'play' || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!tracking || state !== 'play') return;
    tracking = false;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const min = 28;
    if (Math.abs(dx) < min && Math.abs(dy) < min) return;
    e.preventDefault();
    if (Math.abs(dx) > Math.abs(dy)) {
      keys.left = dx < 0;
      keys.right = dx > 0;
    } else {
      keys.up = dy < 0;
      keys.down = dy > 0;
    }
    setTimeout(() => {
      keys.up = false;
      keys.down = false;
      keys.left = false;
      keys.right = false;
    }, 120);
  }, { passive: false });
}

function bindLayoutRefresh() {
  const refresh = () => setTimeout(layoutGame, 50);
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  window.visualViewport?.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('scroll', refresh);
}

bindTouchControls();
bindSwipeMove();
bindTapAdvance();
bindLayoutRefresh();

loadSprites()
  .then(() => {
    bootstrapFromSave();
    layoutGame();
    refreshHint();
    requestAnimationFrame(loop);
  })
  .catch((err) => {
    console.error(err);
    setHint('キャラ素材の読み込みに失敗しました');
  });
