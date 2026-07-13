import { DIRECTIONS, TILE_TYPES, requiredHeight, rotateFacing, tileAt } from './grid';

// The pure core: given a board, a starting pose, and a program (a plain
// array of instruction strings), returns the full step-by-step trace
// before any animation begins. The renderer just plays this trace back —
// it never re-derives game rules. This is what makes the engine testable
// in isolation and the animation layer dumb.
//
// tiles: array of 'step' | 'turnLeft' | 'turnRight' | 'hop'. Plain strings,
// never {id, type} objects — ids are a Phase 2 drag-track UI concern
// layered on top at Play-time (track.map(t => t.type)), not an engine one.
//
// Returns { steps, outcome, failIndex }:
//   outcome: 'success' | 'gap' | 'edge' | 'blocked' | 'incomplete'
//   failIndex: null on success; the failing instruction's index for
//     gap/edge/blocked; tiles.length for 'incomplete' (one past the end —
//     the renderer reads this as "pulse the first empty track slot").
export function executeProgram(board, startPose, tiles) {
  let pose = {
    x: startPose.x,
    y: startPose.y,
    facing: startPose.facing,
    height: startPose.height ?? 0,
  };
  const steps = [];

  // Defensive: already standing on the goal needs zero instructions.
  if (tileAt(board, pose.x, pose.y) === TILE_TYPES.GOAL) {
    return { steps, outcome: 'success', failIndex: null };
  }

  for (let i = 0; i < tiles.length; i++) {
    const step = evaluateStep(board, pose, tiles[i]);
    steps.push({ instructionIndex: i, ...step });

    if (step.result !== 'ok') {
      return { steps, outcome: step.result, failIndex: i };
    }
    pose = step.to;

    if (tileAt(board, pose.x, pose.y) === TILE_TYPES.GOAL) {
      return { steps, outcome: 'success', failIndex: null };
    }
  }

  return { steps, outcome: 'incomplete', failIndex: tiles.length };
}

// One instruction against one pose — the live-follow runner's unit of
// work (each dropped tile is evaluated and animated immediately).
// Returns { type, from, to, result, attempted? }:
//   result 'ok'      → `to` is the new pose (turns always land here)
//   result 'edge' | 'gap' | 'blocked' → `to` === `from`, `attempted` is
//     the refused cell — the failure-theater animations lean toward it.
export function evaluateStep(board, pose, type) {
  const from = { ...pose };

  if (type === 'turnLeft' || type === 'turnRight') {
    return { type, from, to: { ...pose, facing: rotateFacing(pose.facing, type) }, result: 'ok' };
  }

  // type === 'step' | 'hop'
  const { dx, dy } = DIRECTIONS[pose.facing];
  const targetX = pose.x + dx;
  const targetY = pose.y + dy;
  const targetTile = tileAt(board, targetX, targetY);
  const attempted = { x: targetX, y: targetY };

  if (targetTile === undefined) {
    return { type, from, to: from, attempted, result: 'edge' };
  }
  if (targetTile === TILE_TYPES.GAP) {
    return { type, from, to: from, attempted, result: 'gap' };
  }

  const needed = requiredHeight(targetTile);
  if (type === 'step' && pose.height !== needed) {
    return { type, from, to: from, attempted, result: 'blocked' };
  }

  return {
    type,
    from,
    to: { x: targetX, y: targetY, facing: pose.facing, height: type === 'hop' ? needed : pose.height },
    result: 'ok',
  };
}
