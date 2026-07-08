import { DEPTH, TANGRAM_COLORS, shade } from '../../constants/theme';

// Design grid: all shape dimensions are multiples of U so pieces tile exactly.
// Puzzle space is 320x320 (see puzzles.js).
export const U = 20;

// Right triangles have their right angle at the top-left corner at rotation 0.
// Rotation is clockwise (React Native y-down): 90 puts the right angle at the
// top-right, 180 at the bottom-right, 270 at the bottom-left.
// The parallelogram at rotation 0 is a horizontal band whose top edge sits on
// the right half and bottom edge on the left half (slants down-left). Its
// flipped variant mirrors across the vertical center line (slants down-right).
export const SHAPES = {
  square: {
    type: 'square',
    w: 2 * U,
    h: 2 * U,
    color: TANGRAM_COLORS.square,
    vertices: [[0, 0], [2 * U, 0], [2 * U, 2 * U], [0, 2 * U]],
  },
  smallTriangle: {
    type: 'smallTriangle',
    w: 2 * U,
    h: 2 * U,
    color: TANGRAM_COLORS.smallTriangle1,
    vertices: [[0, 0], [2 * U, 0], [0, 2 * U]],
  },
  mediumTriangle: {
    type: 'mediumTriangle',
    w: 3 * U,
    h: 3 * U,
    color: TANGRAM_COLORS.mediumTriangle,
    vertices: [[0, 0], [3 * U, 0], [0, 3 * U]],
  },
  largeTriangle: {
    type: 'largeTriangle',
    w: 4 * U,
    h: 4 * U,
    color: TANGRAM_COLORS.largeTriangle1,
    vertices: [[0, 0], [4 * U, 0], [0, 4 * U]],
  },
  parallelogram: {
    type: 'parallelogram',
    w: 4 * U,
    h: 2 * U,
    color: TANGRAM_COLORS.parallelogram,
    vertices: [[2 * U, 0], [4 * U, 0], [2 * U, 2 * U], [0, 2 * U]],
    flippedVertices: [[0, 0], [2 * U, 0], [4 * U, 2 * U], [2 * U, 2 * U]],
  },
};

export function getShape(type) {
  return SHAPES[type];
}

// Precomputed 2.5D side-face colors per shape type (never compute per frame)
const SIDE_COLORS = Object.fromEntries(
  Object.entries(SHAPES).map(([type, s]) => [type, shade(s.color, DEPTH.sideShade)])
);

export function getShapeSideColor(type) {
  return SIDE_COLORS[type];
}

export function getShapeVertices(type, flip = false) {
  const shape = SHAPES[type];
  return flip && shape.flippedVertices ? shape.flippedVertices : shape.vertices;
}

// SVG path generated from the vertices so there is a single source of truth.
export function getShapePath(type, flip = false) {
  const vertices = getShapeVertices(type, flip);
  return `M ${vertices.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
}
