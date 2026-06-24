/** BGM / SE — シーン連動 */

const BGM_PREF_KEY = 'iyasaka-quest-bgm-v1';
const BGM_VOLUME = 0.3;
const BGM_DUCK_VOLUME = 0.18;
const SE_VOLUME = 0.35;

/** @type {Record<string, { src: string, loop: boolean }>} */
const TRACKS = {
  tavern: { src: 'assets/bgm/maou_bgm_fantasy05.mp3', loop: true },
  field: { src: 'assets/bgm/maou_bgm_fantasy10.mp3', loop: true },
  hill: { src: 'assets/bgm/maou_game_village01.mp3', loop: true },
  akiko: { src: 'assets/bgm/maou_game_theme01.mp3', loop: true },
  cheer: { src: 'assets/bgm/se-cheer-glass.mp3', loop: false },
  jingle: { src: 'assets/bgm/maou_game_jingle09.mp3', loop: false },
};

/** @type {Map<string, HTMLAudioElement>} */
const pool = new Map();

/** @type {string | null} */
let currentBgmKey = null;
/** @type {HTMLAudioElement | null} */
let currentBgm = null;
/** @type {string | null} 現在シーンが要求する BGM */
let sceneBgmKey = null;
let bgmEnabled = true;
let unlocked = false;
let ducking = false;
let fadeToken = 0;
/** @type {string} */
let lastAudioState = '';

function loadBgmPreference() {
  try {
    const v = localStorage.getItem(BGM_PREF_KEY);
    if (v === '0') bgmEnabled = false;
  } catch {
    /* localStorage 不可時は ON のまま */
  }
}

loadBgmPreference();

function getAudio(key) {
  const track = TRACKS[key];
  if (!track) return null;
  if (!pool.has(key)) {
    const el = new Audio(track.src);
    el.preload = 'auto';
    el.loop = track.loop;
    pool.set(key, el);
  }
  return pool.get(key);
}

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
}

export function isBgmEnabled() {
  return bgmEnabled;
}

/** @param {boolean} on */
export function setBgmEnabled(on) {
  bgmEnabled = on;
  try {
    localStorage.setItem(BGM_PREF_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function applyBgmVolume() {
  if (!currentBgm) return;
  currentBgm.volume = ducking ? BGM_DUCK_VOLUME : BGM_VOLUME;
}

function safePlay(el) {
  if (!el || !unlocked) return;
  const p = el.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

export function setBgmDuck(active) {
  ducking = active;
  applyBgmVolume();
}

function pauseBgmPlayback() {
  fadeToken += 1;
  if (currentBgm) {
    currentBgm.pause();
    currentBgm.currentTime = 0;
  }
  currentBgmKey = null;
  currentBgm = null;
}

export function fadeOutBgm(ms = 650) {
  if (!bgmEnabled) {
    pauseBgmPlayback();
    return;
  }
  fadeToken += 1;
  const token = fadeToken;
  if (!currentBgm) return;
  const el = currentBgm;
  const key = currentBgmKey;
  const startVol = el.volume;
  const start = performance.now();

  function tick(now) {
    if (token !== fadeToken) return;
    const t = Math.min(1, (now - start) / ms);
    el.volume = startVol * (1 - t);
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }
    el.pause();
    el.currentTime = 0;
    if (currentBgmKey === key) {
      currentBgmKey = null;
      currentBgm = null;
    }
  }
  requestAnimationFrame(tick);
}

/**
 * @param {string | null} key
 * @param {{ duck?: boolean }} [opts]
 */
export function playBgm(key, opts = {}) {
  fadeToken += 1;
  ducking = !!opts.duck;
  if (!key) {
    pauseBgmPlayback();
    return;
  }
  if (!bgmEnabled) return;
  if (key === currentBgmKey && currentBgm) {
    applyBgmVolume();
    if (currentBgm.paused) safePlay(currentBgm);
    return;
  }

  if (currentBgm) {
    currentBgm.pause();
    currentBgm.currentTime = 0;
  }

  const el = getAudio(key);
  if (!el) return;

  currentBgmKey = key;
  currentBgm = el;
  el.currentTime = 0;
  applyBgmVolume();
  safePlay(el);
}

export function stopBgm() {
  sceneBgmKey = null;
  pauseBgmPlayback();
}

/** @param {'cheer'|'jingle'} key */
export function playSe(key) {
  const el = getAudio(key);
  if (!el) return;
  el.volume = SE_VOLUME;
  el.currentTime = 0;
  safePlay(el);
}

/**
 * @param {string} state
 * @param {string} mapName
 */
export function resolveBgmKey(state, mapName) {
  if (state === 'opening') return 'tavern';
  if (state === 'title') return null;
  if (state === 'intro') return 'field';
  if (state === 'play' || state === 'dialogue') {
    if (mapName === 'indoor') return 'akiko';
    if (mapName === 'hill') return 'hill';
    return 'field';
  }
  return null;
}

/**
 * @param {string} state
 * @param {string} mapName
 * @param {boolean} duck
 */
export function syncSceneAudio(state, mapName, duck) {
  const enteringTitle = state === 'title' && lastAudioState !== 'title';
  const key = resolveBgmKey(state, mapName);
  sceneBgmKey = key;

  if (state === 'title') {
    if (enteringTitle) {
      if (bgmEnabled) fadeOutBgm();
      else pauseBgmPlayback();
    }
    lastAudioState = 'title';
    return;
  }

  lastAudioState = state;
  if (!bgmEnabled) {
    pauseBgmPlayback();
    return;
  }
  playBgm(key, { duck });
}

/** @param {{ text?: string, effect?: string } | null} step */
export function onOpeningStep(step) {
  if (step?.text?.includes('いやさかーー！！')) playSe('cheer');
}
