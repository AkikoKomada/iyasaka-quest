/** 16px タイル — ドラクエ風マップ定義 */

export const TILE = 16;
export const VW = 16; // 表示タイル幅
export const VH = 12; // 表示タイル高

/** @type {Record<number, { color: string, walk: boolean, name: string }>} */
export const TILES = {
  0: { color: '#58a838', walk: true, name: 'grass' },
  1: { color: '#c89858', walk: true, name: 'path' },
  2: { color: '#3888d8', walk: false, name: 'water' },
  3: { color: '#287818', walk: false, name: 'tree' },
  4: { color: '#886848', walk: false, name: 'wall' },
  5: { color: '#684828', walk: true, name: 'door' },
  6: { color: '#b89878', walk: true, name: 'floor' },
  7: { color: '#789878', walk: true, name: 'bush' },
  8: { color: '#a0a0a0', walk: false, name: 'fence' },
  9: { color: '#d0c090', walk: true, name: 'bridge' },
};

// どうがむら — 40×24
// .=grass  ,=path  ~=water  T=tree  #=wall  D=door  b=bush  f=fence  B=bridge
const LEGEND = { '.': 0, ',': 1, '~': 2, T: 3, '#': 4, D: 5, b: 7, f: 8, B: 9, ' ': 0 };

const OUTDOOR_RAW = `
........................................
........................................
....TTTT....................TTTT........
....T..T....TTTTTTTTTTTT....T..T........
....T..T....T,,,,,,,,,T....T..T........
....TTTT....T,bbbbbb,T....TTTT........
............T,bbbbbb,T..................
..TTTT......T,bbbbbb,T......TTTT......
..T..T......T,,D,,,,T......T..T......
..T..T......T,#,#,#,#T......T..T......
..TTTT......T,#,#,#,#T......TTTT......
............T,#,#D#,#T..................
..ffff......T,#,#,#,#T......ffff......
..f,,f......T,,,,,,,,T......f,,f......
..f,,f......T,,,,,,,,T......f,,f......
..f,,f......T,,,,,,,,T......f,,f......
..f,,f......T,,,,,,,,T......f,,f......
..f,,B,B,B,B,B,B,B,B,B,B,B,B,,f......
..f,,,,,,,,,,,,,,,,,,,,,,,,,,f......
..ffff,,,,,,,,,,,,,,,,,,,,,,ffff......
......,,,,,,,,,,,,,,,,,,,,,,..........
......,,,,,,,,,,,,,,,,,,,,,,..........
......,,,,,,,,,,,,,,,,,,,,,,..........
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`.trim();

// アキコの家 — 12×10
const INDOOR_RAW = `
############
#,,,,,,,,,,#
#,,,,,,,,,,#
#,,,,,,,,,,#
#,,,,,,,,,,#
#,,,,,,,,,,#
#,,,,,,,,,,#
#,,,,,,,,,,#
#,,,,D,,,,,#
############
`.trim();

function parse(raw) {
  const rows = raw.split('\n');
  const h = rows.length;
  const w = rows[0].length;
  /** @type {number[][]} */
  const grid = [];
  for (let y = 0; y < h; y++) {
    grid[y] = [];
    for (let x = 0; x < w; x++) {
      grid[y][x] = LEGEND[rows[y][x]] ?? 0;
    }
  }
  return { grid, w, h };
}

export const outdoor = parse(OUTDOOR_RAW);
export const indoor = parse(INDOOR_RAW);

// 告知の丘 — 第2章（30×13）中央に広場
const HILL_RAW = `
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T............................T
T....TTTT............TTTT....T
T....T..T............T..T....T
T....T,,T............T,,T....T
T....TTTT............TTTT....T
T............................T
T............,,,,,,..........T
T............,,,,,,..........T
T............,,,,,,..........T
T............,,,,,,..........T
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
`.trim();

/** 告知看板の位置（タイル座標） */
export const HILL_BOARD_TX = 15;
export const HILL_BOARD_TY = 7;

export const hill = parse(HILL_RAW);

/** @type {Record<string, typeof outdoor>} */
export const MAPS = { outdoor, indoor, hill };

export function getMap(name) {
  return MAPS[name] ?? outdoor;
}

export function isWalkable(map, x, y) {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
  return TILES[map.grid[y][x]]?.walk ?? false;
}

export function tileAt(map, x, y) {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return 0;
  return map.grid[y][x];
}
