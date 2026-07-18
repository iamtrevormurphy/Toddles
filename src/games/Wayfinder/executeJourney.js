import { OBSTACLE_KINDS, TOOL_FOR_KIND, facingAt, nextObstacle, obstacleSpan } from './journey';

// The pure core, PathMaker-style: rules live here, decoupled from rendering.
// The GameScreen just plays evaluations back — it never re-derives game
// logic. State is tiny: { index, built } — the path index Rumi stands on
// and a Set of built obstacle array-indices.

export const ACTIONS = ['move', 'bridge', 'stairs', 'tunnel'];

export function initialState() {
  return { index: 0, built: new Set() };
}

// One action against one state. Returns exactly one of:
//   { kind:'walk', cells, stoppedBy, reachedGoal }
//       cells: [{ x, y, z, index, facing, throughWall }...] — every cell from
//       state.index+1 up to the cell before the next unbuilt obstacle, or the
//       goal. Built obstacles are walked straight through; cells inside a
//       built wall carry throughWall (the obstacle index) so the renderer can
//       run the doorway fade. Never empty — a blocked Move is a noop instead.
//   { kind:'build', obIndex, obstacle } — correct tool at the obstacle seam.
//   { kind:'mismatch', obIndex, obstacle, tool } — wrong tool at the seam.
//   { kind:'noop', reason:'at-goal'|'blocked'|'nothing-to-build', obIndex? }
//       'blocked': Move while an unbuilt obstacle is directly ahead.
//       'nothing-to-build': a tool with no obstacle seam directly ahead.
// Every result is a gentle-theater cue, never an error state.
export function evaluateAction(level, state, action) {
  const lastIndex = level.path.length - 1;
  const blocking = nextObstacle(level, state);

  if (action === 'move') {
    if (state.index >= lastIndex) {
      return { kind: 'noop', reason: 'at-goal' };
    }
    const stopIndex = blocking ? blocking.ob.enter - 1 : lastIndex;
    if (stopIndex <= state.index) {
      return { kind: 'noop', reason: 'blocked', obIndex: blocking.obIndex };
    }
    const cells = [];
    for (let i = state.index + 1; i <= stopIndex; i++) {
      const cell = level.path[i];
      cells.push({
        x: cell.x,
        y: cell.y,
        z: cell.z,
        index: i,
        facing: facingAt(level, i),
        throughWall: wallAround(level, state, i),
      });
    }
    return {
      kind: 'walk',
      cells,
      stoppedBy: blocking ? blocking.obIndex : null,
      reachedGoal: stopIndex === lastIndex,
    };
  }

  // Tool actions only apply to the obstacle whose seam is directly ahead —
  // Rumi must be standing on path[enter - 1]. Building from afar would break
  // the move/build rhythm the game teaches.
  if (!blocking || blocking.ob.enter !== state.index + 1) {
    return { kind: 'noop', reason: 'nothing-to-build' };
  }
  const { ob, obIndex } = blocking;
  if (TOOL_FOR_KIND[ob.kind] === action) {
    return { kind: 'build', obIndex, obstacle: ob };
  }
  return { kind: 'mismatch', obIndex, obstacle: ob, tool: action };
}

// Which built wall (if any) contains path[i] — for the doorway fade.
function wallAround(level, state, i) {
  for (let w = 0; w < level.obstacles.length; w++) {
    const ob = level.obstacles[w];
    if (ob.kind !== OBSTACLE_KINDS.WALL || !state.built.has(w)) continue;
    if (obstacleSpan(ob).includes(i)) return w;
  }
  return null;
}

// Pure reducer. Only walks and builds change state.
export function applyAction(state, evaluation) {
  if (evaluation.kind === 'walk') {
    const last = evaluation.cells[evaluation.cells.length - 1];
    return { index: last.index, built: state.built };
  }
  if (evaluation.kind === 'build') {
    const built = new Set(state.built);
    built.add(evaluation.obIndex);
    return { index: state.index, built };
  }
  return state;
}

// Simulate the deterministic solution (move / correct tool / move …) to
// completion — the validator's workhorse. There is exactly one solution per
// level, so nothing is authored that could drift.
export function solveJourney(level) {
  let state = initialState();
  const taps = [];
  // Each obstacle costs 2 taps (walk + build) plus the final walk; cap
  // generously so a malformed level terminates instead of spinning.
  const maxTaps = level.obstacles.length * 2 + 4;

  while (taps.length < maxTaps) {
    const walk = evaluateAction(level, state, 'move');
    if (walk.kind !== 'walk') {
      return { taps, reachedGoal: false, obstacleCount: level.obstacles.length };
    }
    taps.push('move');
    state = applyAction(state, walk);
    if (walk.reachedGoal) {
      return { taps, reachedGoal: true, obstacleCount: level.obstacles.length };
    }
    const ob = level.obstacles[walk.stoppedBy];
    const tool = TOOL_FOR_KIND[ob.kind];
    const build = evaluateAction(level, state, tool);
    if (build.kind !== 'build') {
      return { taps, reachedGoal: false, obstacleCount: level.obstacles.length };
    }
    taps.push(tool);
    state = applyAction(state, build);
  }
  return { taps, reachedGoal: false, obstacleCount: level.obstacles.length };
}
