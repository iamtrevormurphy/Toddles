// Wayfinder path/obstacle primitives — pure, no React, no RN.
// A level is ONE predefined walkway: `path` is every cell Rumi will ever
// occupy, in walk order (start first, goal last), each { x, y, z }. Gap and
// tunnel cells stay IN the path — Rumi traverses them after the build — so
// per-cell animation, footsteps, and tunnel fades all fall out of one array.
// Obstacles reference path indices: `enter` is the first cell inside/after
// the obstacle; Rumi always stops on path[enter - 1].

export const OBSTACLE_KINDS = {
  GAP: 'gap', // missing decking; span cells have no slab       → bridge
  RISE: 'rise', // a ±1 z seam between enter-1 and enter        → stairs
  WALL: 'wall', // a mass ≥2 tall the path runs straight through → tunnel
};

export const TOOL_FOR_KIND = {
  gap: 'bridge',
  rise: 'stairs',
  wall: 'tunnel',
};

export const FACINGS = ['N', 'E', 'S', 'W'];

// Same grid vocabulary as PathMaker: y grows south. The iso projection is
// purely a rendering concern (iso.js) — engine coordinates never know it.
export const DIRECTIONS = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

function facingFromDelta(from, to) {
  if (to.x > from.x) return 'E';
  if (to.x < from.x) return 'W';
  if (to.y > from.y) return 'S';
  return 'N';
}

// Facing while walking INTO path[index] (index ≥ 1). For index 0 it's the
// direction of the very first stride, so Rumi starts the level already
// looking the right way.
export function facingAt(level, index) {
  const i = Math.max(1, Math.min(index, level.path.length - 1));
  return facingFromDelta(level.path[i - 1], level.path[i]);
}

export function startFacing(level) {
  return facingAt(level, 0);
}

// Path indices covered by an obstacle. A rise is a seam between two cells,
// not a cell itself, so its span is empty.
export function obstacleSpan(ob) {
  if (ob.kind === OBSTACLE_KINDS.RISE) return [];
  const span = [];
  for (let i = 0; i < ob.span; i++) span.push(ob.enter + i);
  return span;
}

// The first obstacle Rumi has not yet passed or built — the one that limits
// his next walk. state = { index, built:Set<obstacle array index> }.
export function nextObstacle(level, state) {
  for (let i = 0; i < level.obstacles.length; i++) {
    const ob = level.obstacles[i];
    if (ob.enter > state.index && !state.built.has(i)) return { ob, obIndex: i };
  }
  return null;
}

// The wall's solid footprint for renderer + validator: its path cells plus
// the z range of the mass sitting on the deck.
export function wallFootprint(level, ob) {
  const cells = obstacleSpan(ob).map((i) => level.path[i]);
  const zBase = cells[0].z;
  return { cells, zBase, height: ob.height };
}
