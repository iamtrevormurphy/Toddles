// Path-Maker level definitions — pure data, no React.
// Phase 1 ships one hardcoded level (board + program both fixed; there's
// no track-editing UI yet, that's Phase 2). Shape matches
// NumberMarble/Tangram's LEVELS array + getLevelById/getNextLevel so
// Phase 3's level-select doesn't need a data migration.

import { TILE_TYPES } from './grid';

const { PATH, GOAL } = TILE_TYPES;

export const PATHMAKER_LEVELS = [
  {
    id: 1,
    board: {
      width: 3,
      height: 3,
      // row-major, y=0 at the top. An L-shaped path from the bottom-left
      // start up to the goal in the top-right corner.
      tiles: [
        PATH, PATH, GOAL,
        PATH, PATH, PATH,
        PATH, PATH, PATH,
      ],
    },
    start: { x: 0, y: 2, facing: 'N' },
    // Up twice, turn to face the goal, across twice.
    program: ['step', 'step', 'turnRight', 'step', 'step'],
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
