import { shade, DEPTH } from '../constants/theme';

// Shared palette for the Shapefolk. Character defs reference these token
// names, never raw hex (see .claude/skills/design-direction/characters.md).
export const CHARACTER_COLORS = {
  teal: '#5FA8A0',
  cornflower: '#6C8FD4',
  amber: '#EDB95F',
  terracotta: '#E2795B',
  lavender: '#A99BD1',
  rose: '#D98BA3',
  moss: '#8FB26E',
  fawn: '#C7A97F', // Lento's dominant honey-taupe
  cocoa: '#8A6E58', // Lento's eye-patch mask, nose, claws
  ink: '#3E3A5E',
  white: '#FFFDF9',
};

export function resolveColor(token) {
  return CHARACTER_COLORS[token] || token;
}

export function sideColor(token) {
  return shade(resolveColor(token), DEPTH.sideShade);
}

export function polyPath(verts) {
  return `M ${verts.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
}

// All subpaths must wind the same way: with the nonzero fill rule, a quad
// winding opposite to the offset polygon would cancel where they overlap.
function windUniform(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area < 0 ? [...points].reverse() : points;
}

// 2.5D side geometry for a polygon: the polygon offset down by `dy` plus a
// quad per edge, all as one multi-subpath path. Every subpath shares one
// fill, so internal overlaps are invisible (works for concave outlines too).
export function extrudeSidePath(verts, dy = DEPTH.extrude.dy) {
  let d = polyPath(windUniform(verts.map(([x, y]) => [x, y + dy])));
  for (let i = 0; i < verts.length; i++) {
    const [x1, y1] = verts[i];
    const [x2, y2] = verts[(i + 1) % verts.length];
    d += ` ${polyPath(windUniform([[x1, y1], [x2, y2], [x2, y2 + dy], [x1, y1 + dy]]))}`;
  }
  return d;
}
