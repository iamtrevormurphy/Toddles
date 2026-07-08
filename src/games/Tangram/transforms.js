import { rotatePolygon, translatePolygon, polygonBounds } from '../../utils/geometry';
import { getShape, getShapeVertices } from './shapes';

// Puzzle-space geometry for slots.
//
// A slot is { shape, cx, cy, rotation, flip? } where (cx, cy) is the center of
// the shape's UNROTATED bounding box. The polygon transform below — flip
// (baked into the vertex set), then rotate about the bbox center, then
// translate the bbox center to (cx, cy) — matches exactly what React Native
// does to a piece view with transform [translate-to-center, rotate, scaleX],
// so the rendered slot and a snapped piece can never disagree.

export function getSlotPolygon(slot) {
  const shape = getShape(slot.shape);
  const vertices = getShapeVertices(slot.shape, slot.flip);
  const center = { x: shape.w / 2, y: shape.h / 2 };
  const rotated = rotatePolygon(vertices, slot.rotation || 0, center);
  return translatePolygon(rotated, slot.cx - center.x, slot.cy - center.y);
}

// Tight bounding box around every slot polygon in a puzzle — used by
// PuzzlePreview to frame the finished picture.
export function getPuzzleBounds(puzzle) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const slot of puzzle.slots) {
    const b = polygonBounds(getSlotPolygon(slot));
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// How the square board window frames a puzzle: zoom in on the puzzle's extent
// (capped so pieces don't get absurdly large) so small pictures like digits
// fill the board instead of floating in empty space.
export function getBoardFrame(puzzle, boardSize, maxScale = 1.8, pad = 20) {
  const bounds = getPuzzleBounds(puzzle);
  const span = Math.max(bounds.width, bounds.height) + pad * 2;
  const scale = Math.min(boardSize / span, maxScale);
  const shownSpan = boardSize / scale;
  return {
    scale,
    originX: bounds.minX + bounds.width / 2 - shownSpan / 2,
    originY: bounds.minY + bounds.height / 2 - shownSpan / 2,
    span: shownSpan,
  };
}

export function puzzleToScreen(point, layout) {
  return {
    x: layout.boardLeft + (point.x - layout.originX) * layout.scale,
    y: layout.boardTop + (point.y - layout.originY) * layout.scale,
  };
}

export function screenToPuzzle(point, layout) {
  return {
    x: layout.originX + (point.x - layout.boardLeft) / layout.scale,
    y: layout.originY + (point.y - layout.boardTop) / layout.scale,
  };
}
