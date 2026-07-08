import { DEPTH } from '../../constants/theme';

// 2.5D extrusion for tangram polygons — PAINT ONLY. Slot polygons, snap
// centers, and hitboxes never change; these helpers only produce extra SVG
// geometry drawn beneath the top faces.
//
// The extrusion vector is straight down (DEPTH.extrude): it is invariant
// under the horizontal flip (scaleX -1) that snapped parallelograms animate,
// and only mis-points during the brief settle rotation, where it is
// imperceptible. Do not switch to a diagonal vector.

export function polygonToPath(polygon) {
  return `M ${polygon.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
}

// All subpaths must wind the same way: with the default nonzero fill rule,
// an edge quad winding opposite to the offset polygon would CANCEL where
// they overlap, punching holes in the side faces.
function windUniform(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area < 0 ? [...points].reverse() : points;
}

// One multi-subpath path containing the polygon offset down by `dy` plus a
// quad per edge. Everything shares a single fill, so internal overlaps are
// invisible — handles concave outlines, and vertical edges degenerate to
// zero-area quads harmlessly.
export function extrusionPath(polygon, dy = DEPTH.extrude.dy) {
  let d = polygonToPath(windUniform(polygon.map(([x, y]) => [x, y + dy])));
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    const quad = windUniform([[x1, y1], [x2, y2], [x2, y2 + dy], [x1, y1 + dy]]);
    d += ` ${polygonToPath(quad)}`;
  }
  return d;
}
