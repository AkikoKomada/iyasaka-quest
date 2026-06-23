/** 異矢世界 — NPC・会話・フラグ・第2章 */

import { HILL_BOARD_TX, HILL_BOARD_TY } from './tiles.js?v=20250623c';
import {
  createDefaultFlags, normalizeFlags, hasAllRequiredSupporters, REQUIRED_SUPPORTERS,
} from './save.js?v=20250623c';

/** @typedef {ReturnType<typeof createDefaultFlags>} GameFlags */

/** @typedef {'outdoor'|'indoor'|'hill'} MapName */

/** @typedef {{ id: string, name: string, x: number, y: number, sprite: string, map: MapName, lines: string[] | (() => string[]) }} NpcDef */

/** @typedef {{ id: string, name: string, map: MapName, x: number, y: number, lines: () => string[] | null, onUse?: () => void }} InteractableDef */

/** @type {NpcDef[]} */
export const NPCS = [
  {
    id: 'sign',
    name: '看板',
    x: 18,
    y: 8,
    sprite: 'sign',
    map: 'outdoor',
    lines: () => {
      const f = getFlags();
      if (f.hasVideo && !f.postedAtHill) {
        return [
          '「どうがむら」',
          '→ 東：告知の丘（いやさかのどうがを 届けよう）',
          '↑ 北：アキコの いえ',
        ];
      }
      if (f.chapter2Complete) {
        return [
          '「どうがむら」',
          '応援の輪が 広がっている！',
          '→ 東：告知の丘',
          '先は 横浜… 10月31日',
        ];
      }
      return [
        '「どうがむら」へ ようこそ！',
        'このむらでは みんな どうがの',
        'まほうを あつかっている。',
        '↑ 北：アキコの いえ',
        '→ 東：いやさかの もり',
      ];
    },
  },
  {
    id: 'murabito_a',
    name: 'むらびとA',
    x: 8,
    y: 14,
    sprite: 'murabito',
    map: 'outdoor',
    lines: () => {
      const f = getFlags();
      if (f.chapter2Complete) {
        return [
          '講演会の 告知、見たよ！',
          'わたしも 応援してる。',
          '横浜まで 道のりは 長いが…',
          '3人なら きっと 届く！',
        ];
      }
      if (f.postedAtHill && !hasSupporter('murabito_a')) {
        addSupporter('murabito_a', 'むらびとA');
        return [
          '丘の 看板、見てきたのか！',
          'いやさかのどうが… 心が 動いた。',
          '10月31日の 講演会、',
          'わたしも 応援するよ！',
        ];
      }
      if (f.postedAtHill) {
        return ['どうがの 力は 人を つなぐんだな。', '応援、続けよう！'];
      }
      if (f.metKochan) return ['コーちゃんに 会ったのか！', 'あいつ すごい コードの', 'まほうを つかうんだ。'];
      return [
        'おお ぼうけんしゃよ！',
        'この いやせかいは ね…',
        'どうがの ちからで うごく',
        'ふしぎな せかい なんだ。',
      ];
    },
  },
  {
    id: 'elder',
    name: 'むらびとB',
    x: 26,
    y: 14,
    sprite: 'elder',
    map: 'outdoor',
    lines: () => {
      const f = getFlags();
      if (f.chapter2Complete) {
        return [
          '応援してくれる人が こんなに…',
          'これが 「価値を 届ける」 って',
          'ことなのね。',
          '横浜の 講演会、',
          'きっと 大盛況よ。',
        ];
      }
      if (f.postedAtHill && !hasSupporter('elder')) {
        addSupporter('elder', 'むらびとB');
        if (hasSupporter('traveler')) {
          return [
            '丘の 看板、見てきたのね。',
            '旅の青年の 話も 聞いたわ。',
            'わたしも 応援する。',
            'あなたたちの 未来が 広がるわ。',
          ];
        }
        return [
          '丘の 看板、見てきたのね。',
          'いやさかのどうが… 心が 動いた。',
          'わたしも 応援する。',
          'あなたたちの 未来が 広がるわ。',
        ];
      }
      if (f.postedAtHill) {
        return ['どうがの 力は 人を つなぐ…', '応援、続けましょう。'];
      }
      if (f.hasVideo) {
        return [
          'いやさかのどうがを てにいれたのね！',
          'この 想いを 人に 届けなさい。',
          '東の 告知の丘 から 始めてみて。',
        ];
      }
      return [
        'むかしむかし…',
        'いやさかのどうが という',
        'でんせつの どうがが あったの。',
        'それを さがす のは',
        'マッチョだけ じゃないわ…',
        'むらの みんなに 話を きいてみなさい。',
      ];
    },
  },
  {
    id: 'kochan',
    name: 'コーちゃん',
    x: 22,
    y: 18,
    sprite: 'kochan',
    map: 'outdoor',
    lines: () => {
      setFlag('metKochan', true);
      const f = getFlags();
      if (f.chapter2Complete) {
        return [
          '第2章 クリア！',
          '応援してくれる人が 増えたね。',
          '次は 横浜へ 向かう 準備だ。',
          '…また マップ つくるから 楽しみに！',
        ];
      }
      if (hasAllRequiredSupporters(f.supporters) && f.postedAtHill) {
        setFlag('chapter2Complete', true);
        return [
          'すごい！ 応援が 3人に なった！',
          'いやさかのどうがは',
          'ちゃんと 人の 心に 届いてる。',
          'これが 「価値を 届ける」 旅だよ。',
          '10月31日・横浜 — また 会おう！',
        ];
      }
      if (f.postedAtHill) {
        if (hasSupporter('traveler')) {
          return [
            '看板に どうがを 貼れたね！',
            '旅の青年が 応援してくれてる。',
            'むらに 戻って 他の ひとも',
            '話しかけてみて。',
          ];
        }
        return [
          '看板に どうがを 貼れたね！',
          '丘の 旅人に 話しかけてみて。',
          'むらに 戻って 他の ひとも',
          '話しかけてみて。',
        ];
      }
      if (f.hasVideo) {
        return [
          'いやさかのどうが、手に入れたね！',
          'これ 広告に 使おう。',
          '10月31日・横浜の 講演会 —',
          'ウリボウが 東を 指してるよ。',
          '→ 告知の丘 へ 行こう！',
        ];
      }
      if (hasMetVillagers() && !f.hasVideo) {
        return [
          'お、よく 話を 聞いたな。',
          'アキコの いえに 行けば',
          'いやさかのどうがが もらえる。',
          '↑ 北の いえ だ！',
        ];
      }
      return [
        'わたしは コーちゃん。',
        'コードの まほうで',
        'せかいを つくってる。',
        'この RPG も そのひとつさ！',
        'むらびとに 話しかけてみて。',
      ];
    },
  },
  {
    id: 'pig',
    name: 'ウリボウ',
    x: 14,
    y: 20,
    sprite: 'pig',
    map: 'outdoor',
    lines: () => {
      const f = getFlags();
      if (f.uribouFollows && f.hasVideo) {
        return [
          'プイッ。',
          '（ウリボウが 東を 見ている）',
          '…告知の丘 へ 行け そうだ。',
        ];
      }
      if (f.hasVideo && !f.uribouFollows) {
        setFlag('uribouFollows', true);
        return [
          'プイッ！',
          '（ウリボウが どうがの 匂いを 嗅いで）',
          '（ウリボウが ついてきた！）',
          '…東の 方へ 導いてくれそうだ。',
        ];
      }
      return [
        'プイッ。',
        '（ウリボウが きょろきょろ している）',
        '…どうがの においが する みたい。',
      ];
    },
  },
  {
    id: 'akiko',
    name: 'アキコ',
    x: 6,
    y: 5,
    sprite: 'akiko',
    map: 'indoor',
    lines: () => {
      const f = getFlags();
      if (f.chapter2Complete) {
        return [
          '応援の輪、広がってるのね！',
          'いやさかのどうがが 人を つないでる。',
          '横浜の 講演会、応援してるわ。',
        ];
      }
      if (f.hasVideo) {
        return [
          'どうがは 届ける ための もの。',
          '告知の丘で 貼ってみて。',
          '応援してくれる人が 増えるはずよ。',
        ];
      }
      if (hasMetVillagers() && !f.hasVideo) {
        return [
          'みんなの 話、聞いたのね。',
          'この「いやさかのどうが」',
          'どうぞ！',
          '人に 届けて。',
          '仲間と 未来を 広げてね。',
        ];
      }
      return [
        'こんにちは アキコです。',
        'このむらで いちばん',
        'どうがが つくれるのは わたし。',
        'でも そのまえに むらの ひとたちに',
        '話を 聞いて きてくれる？',
      ];
    },
  },
  // --- 告知の丘 ---
  {
    id: 'hill_sign',
    name: '道標',
    x: 8,
    y: 4,
    sprite: 'sign',
    map: 'hill',
    lines: () => {
      const f = getFlags();
      if (f.postedAtHill) {
        return [
          '← 西：どうがむらへ もどる',
          '→ 横浜方面（10/31 講演会）',
          '風よけの 丘。告知に ぴったり。',
        ];
      }
      return [
        'ここは 告知の丘。',
        '← 西：どうがむらへ もどれる',
        '風通しが よくて',
        'ポスターが よく 目に 入る。',
        '中央の 大きな 看板に',
        'どうがを 貼ってみよう。',
      ];
    },
  },
  {
    id: 'traveler',
    name: '旅の青年',
    x: 22,
    y: 10,
    sprite: 'traveler',
    map: 'hill',
    lines: () => {
      const f = getFlags();
      if (hasSupporter('traveler')) {
        return [
          'いやさかのどうが、見たよ。',
          '横浜の 講演会、行きたい！',
          '応援 してる！',
        ];
      }
      if (f.postedAtHill) {
        addSupporter('traveler', '旅の青年');
        return [
          '…この 看板、見たよ。',
          'いやさかのどうが —',
          '心が 動かされた。',
          '10月31日・横浜、',
          'ぼくも 応援 させて！',
        ];
      }
      return [
        'ここは 風の 通る 丘だね。',
        '旅の 途中 なんだ。',
        'なにか 貼るなら あの 看板が',
        'よさそうだよ。',
      ];
    },
  },
];

/** @type {InteractableDef[]} */
export const INTERACTABLES = [
  {
    id: 'hill_board',
    name: '告知看板',
    map: 'hill',
    x: HILL_BOARD_TX,
    y: HILL_BOARD_TY,
    lines: () => {
      const f = getFlags();
      if (f.postedAtHill) {
        return [
          'いやさかのどうがが 貼ってある。',
          '風になびく ポスターだ…',
          '（旅人が 足を 止めている）',
        ];
      }
      if (!f.hasVideo) {
        return ['大きな 看板だ。', '…どうがを 持っていない。'];
      }
      setFlag('postedAtHill', true);
      return [
        'いやさかのどうが を 貼った！',
        '風になびく ポスターだ…',
        '（誰かの 足音が 近づいてくる）',
        '価値を 届ける — 最初の一歩。',
      ];
    },
  },
];

/** ドア { x, y, from, to, tx, ty } */
export const DOORS = [
  { x: 15, y: 8, from: 'outdoor', to: 'indoor', tx: 5, ty: 7 },
  { x: 5, y: 8, from: 'indoor', to: 'outdoor', tx: 15, ty: 9 },
];

/** マップ境界ワープ { from, x, y, to, tx, ty, requireHasVideo? } */
export const MAP_EXITS = [
  { from: 'outdoor', x: 39, y: 19, to: 'hill', tx: 1, ty: 11, requireHasVideo: true },
  { from: 'hill', x: 0, y: 11, to: 'outdoor', tx: 38, ty: 19 },
];

/** @type {GameFlags} */
let flags = createDefaultFlags();

/** @type {(() => void) | null} */
let persistHandler = null;

export function setPersistHandler(fn) {
  persistHandler = fn;
}

function requestPersist() {
  persistHandler?.();
}

export function getFlags() {
  return flags;
}

/** @param {Partial<GameFlags>} data */
export function applyFlags(data) {
  flags = normalizeFlags({
    ...createDefaultFlags(),
    ...data,
    talked: { ...createDefaultFlags().talked, ...(data.talked || {}) },
    supporters: Array.isArray(data.supporters) ? [...data.supporters] : [],
  });
}

export function snapshotFlags() {
  return {
    ...flags,
    talked: { ...flags.talked },
    supporters: flags.supporters.map((s) => ({ ...s })),
  };
}

export function setFlag(key, val) {
  flags[key] = val;
  requestPersist();
}

/** むらびとA・B と話した（どうが入手の前提） */
export function hasMetVillagers() {
  return !!(flags.talked?.murabito_a && flags.talked?.elder);
}

export function hasSupporter(id) {
  return flags.supporters.some((s) => s.id === id);
}

export function addSupporter(id, name) {
  if (hasSupporter(id)) return;
  flags.supporters.push({ id, name });
  requestPersist();
}

export function markTalked(id) {
  if (!flags.talked[id]) {
    flags.talked[id] = true;
    requestPersist();
  }
}

export { REQUIRED_SUPPORTERS, hasAllRequiredSupporters };

export function getNpcLines(npc) {
  return typeof npc.lines === 'function' ? npc.lines() : npc.lines;
}

export function npcsOnMap(mapName) {
  const f = getFlags();
  return NPCS.filter((n) => {
    if (n.map !== mapName) return false;
    if (n.id === 'pig' && f.uribouFollows) return false;
    return true;
  });
}

export function findDoor(mapName, tx, ty) {
  return DOORS.find((d) => d.from === mapName && d.x === tx && d.y === ty);
}

export function findMapExit(mapName, tx, ty) {
  return MAP_EXITS.find((e) => e.from === mapName && e.x === tx && e.y === ty);
}

/** 向いている1マス先・足元・看板前のインタラクト */
export function findInteractable(mapName, hx, hy, fdx, fdy) {
  /** @type {{ x: number, y: number }[]} */
  const points = [{ x: hx + fdx, y: hy + fdy }, { x: hx, y: hy }];
  if (mapName === 'hill') {
    const nearBoard =
      Math.abs(hx - HILL_BOARD_TX) <= 1 &&
      hy >= HILL_BOARD_TY &&
      hy <= HILL_BOARD_TY + 2;
    if (nearBoard) points.push({ x: HILL_BOARD_TX, y: HILL_BOARD_TY });
  }
  for (const p of points) {
    const hit = INTERACTABLES.find((i) => i.map === mapName && i.x === p.x && i.y === p.y);
    if (hit) return hit;
  }
  return null;
}

export function getInteractableLines(obj) {
  return obj.lines();
}

export const WORLD = {
  title: '異矢世界QUEST',
  subtitle: '〜 異矢世界（いやさかい）講演会への道 〜',
  intro: [
    'マッチョ・リョウ・みいこは',
    'いやさかの もりを めざして',
    'どうがむらに やってきた！',
    'さあ ぼうけんが はじまる…',
  ],
  chapter2Intro: [
    '— 第2章 —',
    'どうがを 届ける',
    'いやさかのどうがを 手に入れた！',
    'この 想いを 人に 届けよう。',
    '出会い・仲間・応援 —',
    '未来が 広がる 旅が はじまる。',
  ],
};
