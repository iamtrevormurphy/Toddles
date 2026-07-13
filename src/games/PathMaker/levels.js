// Path-Maker level definitions — pure data, no React.
// 12 authored curriculum levels: 1-3 straight corridors (Step only),
// 4-8 turns (single, then composed), 9-12 gap routing. The design doc's
// full curriculum runs to 20, but 13-16 need Hop/raised tiles (Phase 5)
// and 17-20 need Repeat (Phase 6) — neither exists yet, and the palette
// has no way to place those instructions, so shipping those levels now
// would mean the child could reach an unsolvable level. getNextLevel's
// wraparound and getTotalLevels() both work unmodified once more levels
// are appended later — no redesign needed then.

import { TILE_TYPES } from './grid';

const { PATH, GAP, GOAL } = TILE_TYPES;

// `snacks` sit on tiles the SOLUTION path visits (validated by
// scripts/validate-pathmaker.js) so Lento munches them in passing —
// decorative rewards, never gating. `solution` is the validator's
// reference walk. `slotCount` is legacy: live-follow's rolling track
// window ignores it (program length is unbounded), but the validator
// still checks solutions stay within it as a difficulty sanity bound.

export const PATHMAKER_LEVELS = [
  // --- Levels 1-3: straight corridors, Step only ---
  {
    id: 1,
    board: { width: 1, height: 2, tiles: [GOAL, PATH] },
    start: { x: 0, y: 1, facing: 'N' },
    solution: ['step'],
    slotCount: 1,
  },
  {
    id: 2,
    board: { width: 1, height: 3, tiles: [GOAL, PATH, PATH] },
    start: { x: 0, y: 2, facing: 'N' },
    solution: ['step', 'step'],
    slotCount: 2,
    snacks: [{ id: 's1', x: 0, y: 1, kind: 'leaf' }],
  },
  {
    id: 3,
    board: { width: 1, height: 4, tiles: [GOAL, PATH, PATH, PATH] },
    start: { x: 0, y: 3, facing: 'N' },
    solution: ['step', 'step', 'step'],
    slotCount: 3,
    snacks: [
      { id: 's1', x: 0, y: 2, kind: 'berry' },
      { id: 's2', x: 0, y: 1, kind: 'leaf' },
    ],
  },

  // --- Levels 4-8: turns, single then composed ---
  {
    id: 4,
    board: {
      width: 2,
      height: 2,
      tiles: [PATH, GOAL, PATH, PATH],
    },
    start: { x: 0, y: 1, facing: 'N' },
    solution: ['step', 'turnRight', 'step'],
    slotCount: 3,
    snacks: [{ id: 's1', x: 0, y: 0, kind: 'leaf' }],
  },
  {
    id: 5,
    board: {
      width: 2,
      height: 2,
      tiles: [GOAL, PATH, PATH, PATH],
    },
    start: { x: 1, y: 1, facing: 'N' },
    solution: ['step', 'turnLeft', 'step'],
    slotCount: 3,
    snacks: [{ id: 's1', x: 1, y: 0, kind: 'berry' }],
  },
  {
    id: 6,
    board: {
      width: 3,
      height: 3,
      tiles: [
        PATH, GOAL, PATH,
        PATH, PATH, PATH,
        PATH, PATH, PATH,
      ],
    },
    start: { x: 0, y: 2, facing: 'N' },
    solution: ['step', 'turnRight', 'step', 'turnLeft', 'step'],
    slotCount: 5,
    snacks: [
      { id: 's1', x: 0, y: 1, kind: 'leaf' },
      { id: 's2', x: 1, y: 1, kind: 'berry' },
    ],
  },
  {
    id: 7,
    board: {
      width: 3,
      height: 4,
      tiles: [
        PATH, PATH, GOAL,
        PATH, PATH, PATH,
        PATH, PATH, PATH,
        PATH, PATH, PATH,
      ],
    },
    start: { x: 0, y: 3, facing: 'N' },
    solution: ['step', 'step', 'turnRight', 'step', 'turnLeft', 'step', 'turnRight', 'step'],
    slotCount: 8,
    snacks: [
      { id: 's1', x: 0, y: 2, kind: 'leaf' },
      { id: 's2', x: 1, y: 1, kind: 'berry' },
      { id: 's3', x: 1, y: 0, kind: 'leaf' },
    ],
  },
  {
    id: 8,
    board: {
      width: 2,
      height: 3,
      tiles: [
        PATH, PATH,
        PATH, PATH,
        PATH, GOAL,
      ],
    },
    start: { x: 0, y: 0, facing: 'S' },
    solution: ['step', 'step', 'turnLeft', 'step'],
    slotCount: 4,
    snacks: [
      { id: 's1', x: 0, y: 1, kind: 'leaf' },
      { id: 's2', x: 0, y: 2, kind: 'berry' },
    ],
  },

  // --- Levels 9-12: gap tiles as routing constraints ---
  {
    id: 9,
    board: {
      width: 3,
      height: 2,
      tiles: [
        GAP, PATH, GOAL,
        PATH, PATH, PATH,
      ],
    },
    start: { x: 0, y: 1, facing: 'N' },
    solution: ['turnRight', 'step', 'turnLeft', 'step', 'turnRight', 'step'],
    slotCount: 6,
    snacks: [
      { id: 's1', x: 1, y: 1, kind: 'leaf' },
      { id: 's2', x: 1, y: 0, kind: 'berry' },
    ],
  },
  {
    id: 10,
    board: {
      width: 3,
      height: 3,
      tiles: [
        PATH, GAP, PATH,
        PATH, GAP, PATH,
        PATH, PATH, GOAL,
      ],
    },
    start: { x: 0, y: 0, facing: 'S' },
    solution: ['step', 'step', 'turnLeft', 'step', 'step'],
    slotCount: 5,
    snacks: [
      { id: 's1', x: 0, y: 1, kind: 'leaf' },
      { id: 's2', x: 1, y: 2, kind: 'berry' },
    ],
  },
  {
    id: 11,
    board: {
      width: 4,
      height: 3,
      tiles: [
        PATH, GAP, GAP, GOAL,
        PATH, GAP, PATH, PATH,
        PATH, PATH, PATH, PATH,
      ],
    },
    start: { x: 0, y: 2, facing: 'N' },
    solution: ['turnRight', 'step', 'step', 'step', 'turnLeft', 'step', 'step'],
    slotCount: 7,
    snacks: [
      { id: 's1', x: 1, y: 2, kind: 'leaf' },
      { id: 's2', x: 3, y: 2, kind: 'berry' },
      { id: 's3', x: 3, y: 1, kind: 'leaf' },
    ],
  },
  {
    id: 12,
    board: {
      width: 4,
      height: 4,
      tiles: [
        PATH, GAP, PATH, GOAL,
        PATH, GAP, PATH, GAP,
        PATH, PATH, PATH, PATH,
        PATH, GAP, PATH, PATH,
      ],
    },
    start: { x: 0, y: 3, facing: 'N' },
    solution: ['step', 'turnRight', 'step', 'step', 'turnLeft', 'step', 'step', 'turnRight', 'step'],
    slotCount: 9,
    snacks: [
      { id: 's1', x: 0, y: 2, kind: 'leaf' },
      { id: 's2', x: 2, y: 2, kind: 'berry' },
      { id: 's3', x: 2, y: 1, kind: 'leaf' },
    ],
  },
];

export function getLevelById(id) {
  return PATHMAKER_LEVELS.find((l) => l.id === id) || PATHMAKER_LEVELS[0];
}

export function getNextLevel(currentId) {
  const currentIndex = PATHMAKER_LEVELS.findIndex((l) => l.id === currentId);
  const nextIndex = (currentIndex + 1) % PATHMAKER_LEVELS.length;
  return PATHMAKER_LEVELS[nextIndex];
}

export function getTotalLevels() {
  return PATHMAKER_LEVELS.length;
}
