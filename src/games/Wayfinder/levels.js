// Wayfinder levels — pure data, no React.
//
// Format (see journey.js for the vocabulary):
//   path      every cell Rumi ever occupies, start→goal, 4-connected,
//             gap/tunnel cells INCLUDED; z changes ONLY across a 'rise' seam
//   obstacles ordered by `enter` (path index of the first cell inside/after
//             the obstacle; Rumi stops on path[enter-1]):
//               { kind:'gap',  enter, span }          → bridge
//               { kind:'rise', enter }                → stairs (dir = z delta)
//               { kind:'wall', enter, span, height }  → tunnel (height ≥ 2)
//   decor     non-path Monument Valley columns:
//             { x, y, zBase, height, cap:'flat'|'dome'|'finial' }
//
// There is no solution field: with one walkway the solution is deterministic
// (move / correct tool / move …) and the validator computes it by simulation.
// Curriculum floor: every level has ≥3 obstacles, so nothing completes in
// fewer than 7 taps — no trivial one-move levels.
//
// Authoring rule (enforced by scripts/validate-wayfinder.js): no decor column
// or foreign wall may sit screen-in-front of any path cell close enough to
// overlap Rumi — the renderer never depth-sorts the character, so levels must
// be authored occlusion-safe.

export const WAYFINDER_LEVELS = [
  // L1 — three single gaps on a flat S-curve. Teaches Bridge and the
  // move/build/move rhythm. 7 taps.
  {
    id: 1,
    path: [
      { x: 0, y: 4, z: 0 },
      { x: 1, y: 4, z: 0 },
      { x: 2, y: 4, z: 0 }, // gap
      { x: 3, y: 4, z: 0 },
      { x: 3, y: 3, z: 0 },
      { x: 3, y: 2, z: 0 }, // gap
      { x: 3, y: 1, z: 0 },
      { x: 4, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 }, // gap
      { x: 6, y: 1, z: 0 },
      { x: 6, y: 0, z: 0 }, // goal
    ],
    obstacles: [
      { kind: 'gap', enter: 2, span: 1 },
      { kind: 'gap', enter: 5, span: 1 },
      { kind: 'gap', enter: 8, span: 1 },
    ],
    decor: [],
  },

  // L2 — three gaps, one a double span, around a U. Longer bridges, corners
  // between obstacles. 7 taps.
  {
    id: 2,
    path: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 2, z: 0 }, // gap
      { x: 0, y: 3, z: 0 },
      { x: 0, y: 4, z: 0 },
      { x: 1, y: 4, z: 0 },
      { x: 2, y: 4, z: 0 }, // gap (span 2)
      { x: 3, y: 4, z: 0 }, // gap (span 2)
      { x: 4, y: 4, z: 0 },
      { x: 4, y: 3, z: 0 },
      { x: 4, y: 2, z: 0 }, // gap
      { x: 4, y: 1, z: 0 },
      { x: 4, y: 0, z: 0 }, // goal
    ],
    obstacles: [
      { kind: 'gap', enter: 2, span: 1 },
      { kind: 'gap', enter: 6, span: 2 },
      { kind: 'gap', enter: 10, span: 1 },
    ],
    decor: [],
  },

  // L3 — two gaps and the first stair climb to a z1 plateau; the goal sits
  // high. 7 taps.
  {
    id: 3,
    path: [
      { x: 0, y: 3, z: 0 },
      { x: 1, y: 3, z: 0 },
      { x: 2, y: 3, z: 0 }, // gap
      { x: 3, y: 3, z: 0 },
      { x: 3, y: 2, z: 0 },
      { x: 3, y: 1, z: 1 }, // rise seam crossed entering here
      { x: 4, y: 1, z: 1 },
      { x: 5, y: 1, z: 1 }, // gap (bridged at height)
      { x: 6, y: 1, z: 1 }, // goal
    ],
    obstacles: [
      { kind: 'gap', enter: 2, span: 1 },
      { kind: 'rise', enter: 5 },
      { kind: 'gap', enter: 7, span: 1 },
    ],
    decor: [],
  },
];

// (Levels 4–10 continue the curriculum: stairs both directions, tunnel
// intro and confidence, then mixed 4–5 obstacle journeys. All spacing and
// occlusion-safety is enforced by scripts/validate-wayfinder.js.)
WAYFINDER_LEVELS.push(
  // L4 — over the hill: stairs up, a bridge at height, stairs back down.
  {
    id: 4,
    path: [
      { x: 0, y: 3, z: 0 },
      { x: 1, y: 3, z: 0 },
      { x: 2, y: 3, z: 1 }, // rise up
      { x: 3, y: 3, z: 1 },
      { x: 4, y: 3, z: 1 }, // gap at height
      { x: 5, y: 3, z: 1 },
      { x: 6, y: 3, z: 0 }, // rise down
      { x: 7, y: 3, z: 0 },
      { x: 7, y: 2, z: 0 }, // goal
    ],
    obstacles: [
      { kind: 'rise', enter: 2 },
      { kind: 'gap', enter: 4, span: 1 },
      { kind: 'rise', enter: 6 },
    ],
    decor: [{ x: 3, y: 1, zBase: 0, height: 2, cap: 'dome' }],
  },

  // L5 — tunnel intro: bridge, stairs, then the first wall to carve.
  {
    id: 5,
    path: [
      { x: 0, y: 4, z: 0 },
      { x: 1, y: 4, z: 0 },
      { x: 2, y: 4, z: 0 }, // gap
      { x: 3, y: 4, z: 0 },
      { x: 3, y: 3, z: 0 },
      { x: 3, y: 2, z: 1 }, // rise up
      { x: 4, y: 2, z: 1 },
      { x: 5, y: 2, z: 1 }, // wall (tunnel!)
      { x: 6, y: 2, z: 1 },
      { x: 6, y: 1, z: 1 }, // goal
    ],
    obstacles: [
      { kind: 'gap', enter: 2, span: 1 },
      { kind: 'rise', enter: 5 },
      { kind: 'wall', enter: 7, span: 1, height: 2 },
    ],
    decor: [],
  },

  // L6 — tunnel confidence: two masses with a bridge between them.
  {
    id: 6,
    path: [
      { x: 0, y: 2, z: 0 },
      { x: 1, y: 2, z: 0 },
      { x: 2, y: 2, z: 0 }, // wall
      { x: 3, y: 2, z: 0 },
      { x: 4, y: 2, z: 0 }, // gap
      { x: 5, y: 2, z: 0 },
      { x: 6, y: 2, z: 0 }, // wall
      { x: 7, y: 2, z: 0 },
      { x: 7, y: 1, z: 0 }, // goal
    ],
    obstacles: [
      { kind: 'wall', enter: 2, span: 1, height: 2 },
      { kind: 'gap', enter: 4, span: 1 },
      { kind: 'wall', enter: 6, span: 1, height: 2 },
    ],
    decor: [{ x: 4, y: 0, zBase: 0, height: 3, cap: 'dome' }],
  },

  // L7 — first mixed review: all three tools in one journey, 9 taps.
  {
    id: 7,
    path: [
      { x: 0, y: 5, z: 0 },
      { x: 0, y: 4, z: 0 },
      { x: 0, y: 3, z: 0 }, // gap
      { x: 0, y: 2, z: 0 },
      { x: 1, y: 2, z: 0 },
      { x: 2, y: 2, z: 1 }, // rise up
      { x: 3, y: 2, z: 1 },
      { x: 4, y: 2, z: 1 }, // wall
      { x: 5, y: 2, z: 1 },
      { x: 5, y: 3, z: 1 },
      { x: 6, y: 3, z: 1 }, // gap
      { x: 7, y: 3, z: 1 }, // goal
    ],
    obstacles: [
      { kind: 'gap', enter: 2, span: 1 },
      { kind: 'rise', enter: 5 },
      { kind: 'wall', enter: 7, span: 1, height: 2 },
      { kind: 'gap', enter: 10, span: 1 },
    ],
    decor: [{ x: 1, y: 0, zBase: 0, height: 3, cap: 'dome' }],
  },

  // L8 — multi-height: climb to z2, carve a grand wall, come back down.
  {
    id: 8,
    path: [
      { x: 0, y: 4, z: 0 },
      { x: 1, y: 4, z: 0 },
      { x: 1, y: 3, z: 1 }, // rise up
      { x: 2, y: 3, z: 1 },
      { x: 2, y: 2, z: 2 }, // rise up again
      { x: 3, y: 2, z: 2 },
      { x: 4, y: 2, z: 2 }, // wall (tall!)
      { x: 5, y: 2, z: 2 },
      { x: 5, y: 1, z: 2 },
      { x: 6, y: 1, z: 1 }, // rise down
      { x: 7, y: 1, z: 1 }, // goal
    ],
    obstacles: [
      { kind: 'rise', enter: 2 },
      { kind: 'rise', enter: 4 },
      { kind: 'wall', enter: 6, span: 1, height: 3 },
      { kind: 'rise', enter: 9 },
    ],
    decor: [
      { x: 0, y: 0, zBase: 0, height: 2, cap: 'flat' },
      { x: 7, y: 3, zBase: 0, height: 2, cap: 'finial' },
    ],
  },

  // L9 — stamina: the long meander, 20 cells, 5 obstacles, 11 taps.
  {
    id: 9,
    path: [
      { x: 0, y: 6, z: 0 },
      { x: 1, y: 6, z: 0 },
      { x: 1, y: 5, z: 0 },
      { x: 1, y: 4, z: 0 }, // gap (span 2)
      { x: 1, y: 3, z: 0 }, // gap
      { x: 1, y: 2, z: 0 },
      { x: 2, y: 2, z: 0 },
      { x: 3, y: 2, z: 1 }, // rise up
      { x: 4, y: 2, z: 1 },
      { x: 5, y: 2, z: 1 },
      { x: 6, y: 2, z: 1 }, // wall (span 2)
      { x: 7, y: 2, z: 1 }, // wall
      { x: 8, y: 2, z: 1 },
      { x: 8, y: 1, z: 1 },
      { x: 8, y: 0, z: 1 }, // gap
      { x: 9, y: 0, z: 1 },
      { x: 10, y: 0, z: 1 },
      { x: 11, y: 0, z: 0 }, // rise down
      { x: 12, y: 0, z: 0 },
      { x: 12, y: 1, z: 0 }, // goal
    ],
    obstacles: [
      { kind: 'gap', enter: 3, span: 2 },
      { kind: 'rise', enter: 7 },
      { kind: 'wall', enter: 10, span: 2, height: 2 },
      { kind: 'gap', enter: 14, span: 1 },
      { kind: 'rise', enter: 17 },
    ],
    decor: [
      { x: 5, y: 6, zBase: 0, height: 3, cap: 'dome' },
      { x: 11, y: 2, zBase: 0, height: 2, cap: 'finial' },
    ],
  },

  // L10 — graduation: every mechanic, winding through the grand monument.
  {
    id: 10,
    path: [
      { x: 0, y: 3, z: 0 },
      { x: 1, y: 3, z: 0 },
      { x: 2, y: 3, z: 0 }, // wall
      { x: 3, y: 3, z: 0 },
      { x: 3, y: 2, z: 0 },
      { x: 3, y: 1, z: 1 }, // rise up
      { x: 4, y: 1, z: 1 },
      { x: 5, y: 1, z: 1 }, // gap (span 2)
      { x: 6, y: 1, z: 1 }, // gap
      { x: 7, y: 1, z: 1 },
      { x: 8, y: 1, z: 1 },
      { x: 9, y: 1, z: 1 }, // wall (tall!)
      { x: 10, y: 1, z: 1 },
      { x: 10, y: 2, z: 1 },
      { x: 11, y: 2, z: 2 }, // rise up to the summit
      { x: 12, y: 2, z: 2 }, // goal
    ],
    obstacles: [
      { kind: 'wall', enter: 2, span: 1, height: 2 },
      { kind: 'rise', enter: 5 },
      { kind: 'gap', enter: 7, span: 2 },
      { kind: 'wall', enter: 11, span: 1, height: 3 },
      { kind: 'rise', enter: 14 },
    ],
    decor: [
      { x: 0, y: 0, zBase: 0, height: 3, cap: 'dome' },
      { x: 6, y: 5, zBase: 0, height: 2, cap: 'finial' },
    ],
  }
);

export function getLevelById(id) {
  return WAYFINDER_LEVELS.find((level) => level.id === id) ?? WAYFINDER_LEVELS[0];
}

export function getNextLevel(currentId) {
  const index = WAYFINDER_LEVELS.findIndex((level) => level.id === currentId);
  return WAYFINDER_LEVELS[(index + 1) % WAYFINDER_LEVELS.length];
}

export function getTotalLevels() {
  return WAYFINDER_LEVELS.length;
}
