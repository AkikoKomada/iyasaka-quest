/** 異矢世界QUEST — localStorage セーブ */

export const SAVE_KEY = 'iyasaka-quest-ko-v1';

/** 第2章クリアに必要な応援者（順不同） */
export const REQUIRED_SUPPORTERS = ['traveler', 'murabito_a', 'elder'];

/** @returns {import('./world.js').GameFlags} */
export function createDefaultFlags() {
  return {
    metKochan: false,
    hasVideo: false,
    talked: {},
    chapter2Unlocked: false,
    chapter2IntroSeen: false,
    chapter2Complete: false,
    postedAtHill: false,
    uribouFollows: false,
    supporters: [],
  };
}

/** @param {{ id: string, name: string }[]} supporters */
export function hasAllRequiredSupporters(supporters) {
  const ids = new Set((supporters || []).map((s) => s.id));
  return REQUIRED_SUPPORTERS.every((id) => ids.has(id));
}

/** むらびとA・むらびとB（elder）と会話済みか */
function hasMetVillagersInFlags(flags) {
  return !!(flags.talked?.murabito_a && flags.talked?.elder);
}

/** 起動時 — フラグの矛盾だけ補正 */
/** @param {import('./world.js').GameFlags} flags */
export function normalizeFlags(flags) {
  if (!flags.talked || typeof flags.talked !== 'object') flags.talked = {};
  if (!Array.isArray(flags.supporters)) flags.supporters = [];

  if (flags.hasVideo && !hasMetVillagersInFlags(flags)) {
    flags.hasVideo = false;
    flags.chapter2Unlocked = false;
  }
  if (flags.hasVideo) flags.chapter2Unlocked = true;
  if (flags.postedAtHill && !flags.hasVideo) flags.postedAtHill = false;

  const chapter2Ready =
    flags.hasVideo &&
    flags.postedAtHill &&
    hasAllRequiredSupporters(flags.supporters);
  flags.chapter2Complete = chapter2Ready;

  return flags;
}

/** @typedef {'title'|'intro'|'play'|'dialogue'} GameState */

/**
 * @typedef {Object} GameSave
 * @property {number} v
 * @property {boolean} started
 * @property {GameState} state
 * @property {string} mapName
 * @property {string} dir
 * @property {number} introIndex
 * @property {{ facing: string, history: { tx: number, ty: number, dir: string }[] }} trail
 * @property {import('./world.js').GameFlags} flags
 */

/** @returns {GameSave} */
export function createDefaultSave() {
  return {
    v: 1,
    started: false,
    state: 'title',
    mapName: 'outdoor',
    dir: 'down',
    introIndex: 0,
    trail: {
      facing: 'down',
      history: [{ tx: 20, ty: 16, dir: 'down' }],
    },
    flags: createDefaultFlags(),
  };
}

/** @param {Partial<GameSave>} data */
export function loadSave(data = {}) {
  const base = createDefaultSave();
  const flags = normalizeFlags({
    ...createDefaultFlags(),
    ...(data.flags || {}),
    talked: { ...createDefaultFlags().talked, ...(data.flags?.talked || {}) },
    supporters: Array.isArray(data.flags?.supporters) ? [...data.flags.supporters] : [],
  });
  const history = Array.isArray(data.trail?.history) && data.trail.history.length
    ? data.trail.history.slice(-120)
    : base.trail.history;
  return {
    ...base,
    ...data,
    trail: { facing: data.trail?.facing || base.trail.facing, history },
    flags,
  };
}

const VALID_MAPS = new Set(['outdoor', 'indoor', 'hill']);
const VALID_STATES = new Set(['title', 'intro', 'play', 'dialogue']);

/** @param {Partial<GameSave> | null | undefined} save */
export function isRestorableSave(save) {
  if (!save?.started) return false;
  if (!VALID_MAPS.has(save.mapName)) return false;
  if (!VALID_STATES.has(save.state)) return false;
  const history = save.trail?.history;
  if (!Array.isArray(history) || history.length === 0) return false;
  return history.every(
    (step) =>
      step &&
      Number.isFinite(step.tx) &&
      Number.isFinite(step.ty) &&
      typeof step.dir === 'string'
  );
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* private mode */ }
}

export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = loadSave(JSON.parse(raw));
    return isRestorableSave(save) || !save.started ? save : null;
  } catch {
    return null;
  }
}

/** @param {GameSave} save */
export function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch { /* private mode */ }
}
