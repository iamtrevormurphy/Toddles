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
    const type = tiles[i];
    const from = { ...pose };

    if (type === 'turnLeft' || type === 'turnRight') {
      pose = { ...pose, facing: rotateFacing(pose.facing, type) };
      steps.push({ instructionIndex: i, type, from, to: { ...pose }, result: 'ok' });
      continue;
    }

    // type === 'step' | 'hop'
    const { dx, dy } = DIRECTIONS[pose.facing];
    const targetX = pose.x + dx;
    const targetY = pose.y + dy;
    const targetTile = tileAt(board, targetX, targetY);

    if (targetTile === undefined) {
      steps.push({ instructionIndex: i, type, from, to: from, attempted: { x: targetX, y: targetY }, result: 'edge' });
      return { steps, outcome: 'edge', failIndex: i };
    }
    if (targetTile === TILE_TYPES.GAP) {
      steps.push({ instructionIndex: i, type, from, to: from, attempted: { x: targetX, y: targetY }, result: 'gap' });
      return { steps, outcome: 'gap', failIndex: i };
    }

    const needed = requiredHeight(targetTile);
    if (type === 'step' && pose.height !== needed) {
      steps.push({ instructionIndex: i, type, from, to: from, attempted: { x: targetX, y: targetY }, result: 'blocked' });
      return { steps, outcome: 'blocked', failIndex: i };
    }

    pose = { x: targetX, y: targetY, facing: pose.facing, height: type === 'hop' ? needed : pose.height };
    steps.push({ instructionIndex: i, type, from, to: { ...pose }, result: 'ok' });

    if (targetTile === TILE_TYPES.GOAL) {
      return { steps, outcome: 'success', failIndex: null };
    }
  }

  return { steps, outcome: 'incomplete', failIndex: tiles.length };
}
