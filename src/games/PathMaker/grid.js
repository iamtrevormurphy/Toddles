// Path-Maker board/pose primitives — pure, no React, no RN.
// Board shape: { width, height, tiles }, tiles is a flat row-major array
// (index = y*width + x), so the one bounds-check (tileAt) can't drift out
// of sync with a jagged nested-array typo.

export const TILE_TYPES = {
  PATH: 'path',
  GAP: 'gap',
  RAISED: 'raised',
  GOAL: 'goal',
};

export const FACINGS = ['N', 'E', 'S', 'W'];

export const DIRECTIONS = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

// Returns the tile type at (x, y), or undefined if outside the board —
// that undefined IS "off the island edge," no separate void tile needed.
export function tileAt(board, x, y) {
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return undefined;
  return board.tiles[y * board.width + x];
}

// Enum rotation — no degree arithmetic, so there's no negative-modulo
// footgun for turnLeft.
export function rotateFacing(facing, turnType) {
  const i = FACINGS.indexOf(facing);
  const delta = turnType === 'turnRight' ? 1 : -1;
  return FACINGS[(i + delta + FACINGS.length) % FACINGS.length];
}

// The height a character must be at to occupy this tile type.
export function requiredHeight(tileType) {
  return tileType === TILE_TYPES.RAISED ? 1 : 0;
}

// Single source of truth for the goal's location — it's just a tile,
// never a separately-stored coordinate that could drift out of sync.
export function findGoal(board) {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (tileAt(board, x, y) === TILE_TYPES.GOAL) return { x, y };
    }
  }
  return null;
}
