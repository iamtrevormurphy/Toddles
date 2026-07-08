// Polygon geometry utilities for tangram validation
// Uses ray casting for point-in-polygon and SAT for overlap detection

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {Object} point - {x, y}
 * @param {Array} polygon - Array of [x, y] vertices
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate the centroid (center of mass) of a polygon
 * @param {Array} polygon - Array of [x, y] vertices
 * @returns {Object} {x, y}
 */
export function polygonCentroid(polygon) {
  let cx = 0, cy = 0, area = 0;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const x0 = polygon[j][0], y0 = polygon[j][1];
    const x1 = polygon[i][0], y1 = polygon[i][1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area /= 2;
  if (Math.abs(area) < 1e-10) {
    // Degenerate polygon, return average of vertices
    const avgX = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const avgY = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
    return { x: avgX, y: avgY };
  }

  cx /= (6 * area);
  cy /= (6 * area);

  return { x: cx, y: cy };
}

/**
 * Rotate a polygon around a center point
 * @param {Array} polygon - Array of [x, y] vertices
 * @param {number} angleDeg - Rotation angle in degrees
 * @param {Object} center - {x, y} rotation center (defaults to polygon centroid)
 * @returns {Array} Rotated polygon vertices
 */
export function rotatePolygon(polygon, angleDeg, center = null) {
  const c = center || polygonCentroid(polygon);
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return polygon.map(([x, y]) => {
    const dx = x - c.x;
    const dy = y - c.y;
    return [
      c.x + dx * cos - dy * sin,
      c.y + dx * sin + dy * cos,
    ];
  });
}

/**
 * Translate a polygon by an offset
 * @param {Array} polygon - Array of [x, y] vertices
 * @param {number} dx - X offset
 * @param {number} dy - Y offset
 * @returns {Array} Translated polygon vertices
 */
export function translatePolygon(polygon, dx, dy) {
  return polygon.map(([x, y]) => [x + dx, y + dy]);
}

/**
 * Scale a polygon from its centroid
 * @param {Array} polygon - Array of [x, y] vertices
 * @param {number} scale - Scale factor
 * @param {Object} center - {x, y} scale center (defaults to polygon centroid)
 * @returns {Array} Scaled polygon vertices
 */
export function scalePolygon(polygon, scale, center = null) {
  const c = center || polygonCentroid(polygon);

  return polygon.map(([x, y]) => [
    c.x + (x - c.x) * scale,
    c.y + (y - c.y) * scale,
  ]);
}

/**
 * Get the axis-aligned bounding box of a polygon
 * @param {Array} polygon - Array of [x, y] vertices
 * @returns {Object} {minX, minY, maxX, maxY}
 */
export function polygonBounds(polygon) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Check if two axis-aligned bounding boxes overlap
 * @param {Object} a - {minX, minY, maxX, maxY}
 * @param {Object} b - {minX, minY, maxX, maxY}
 * @returns {boolean}
 */
export function boundsOverlap(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX &&
         a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Project a polygon onto an axis and return the min/max values
 * @param {Array} polygon - Array of [x, y] vertices
 * @param {Array} axis - [x, y] normalized axis vector
 * @returns {Object} {min, max}
 */
function projectPolygon(polygon, axis) {
  let min = Infinity, max = -Infinity;

  for (const [x, y] of polygon) {
    const projection = x * axis[0] + y * axis[1];
    if (projection < min) min = projection;
    if (projection > max) max = projection;
  }

  return { min, max };
}

/**
 * Get the edge normals of a polygon for SAT
 * @param {Array} polygon - Array of [x, y] vertices
 * @returns {Array} Array of [x, y] normalized axis vectors
 */
function getPolygonAxes(polygon) {
  const axes = [];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    // Edge vector
    const edgeX = p2[0] - p1[0];
    const edgeY = p2[1] - p1[1];

    // Perpendicular (normal) vector
    const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
    if (len > 1e-10) {
      axes.push([-edgeY / len, edgeX / len]);
    }
  }

  return axes;
}

/**
 * Check if two convex polygons overlap using Separating Axis Theorem (SAT)
 * @param {Array} poly1 - Array of [x, y] vertices
 * @param {Array} poly2 - Array of [x, y] vertices
 * @param {number} tolerance - Negative tolerance allows slight overlap before detecting collision
 * @returns {boolean}
 */
export function polygonsOverlap(poly1, poly2, tolerance = 0) {
  // Quick bounds check first
  const bounds1 = polygonBounds(poly1);
  const bounds2 = polygonBounds(poly2);
  if (!boundsOverlap(bounds1, bounds2)) {
    return false;
  }

  // Get all axes to test
  const axes = [...getPolygonAxes(poly1), ...getPolygonAxes(poly2)];

  for (const axis of axes) {
    const proj1 = projectPolygon(poly1, axis);
    const proj2 = projectPolygon(poly2, axis);

    // Check for separation (with tolerance)
    const gap = Math.max(proj1.min - proj2.max, proj2.min - proj1.max);
    if (gap > -tolerance) {
      // Found a separating axis
      return false;
    }
  }

  // No separating axis found, polygons overlap
  return true;
}

/**
 * Calculate the overlap area between two polygons (approximate)
 * Uses sampling to estimate overlap percentage
 * @param {Array} poly1 - Array of [x, y] vertices
 * @param {Array} poly2 - Array of [x, y] vertices
 * @param {number} samples - Number of sample points per polygon
 * @returns {number} Estimated overlap ratio (0-1)
 */
export function estimateOverlapRatio(poly1, poly2, samples = 20) {
  const bounds1 = polygonBounds(poly1);
  let insideCount = 0;
  let totalSamples = 0;

  // Sample points from poly1 and check if they're in poly2
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const x = bounds1.minX + (bounds1.maxX - bounds1.minX) * (i / (samples - 1));
      const y = bounds1.minY + (bounds1.maxY - bounds1.minY) * (j / (samples - 1));
      const point = { x, y };

      if (pointInPolygon(point, poly1)) {
        totalSamples++;
        if (pointInPolygon(point, poly2)) {
          insideCount++;
        }
      }
    }
  }

  return totalSamples > 0 ? insideCount / totalSamples : 0;
}

/**
 * Get the transformed polygon vertices for a tangram piece
 * @param {Object} shape - Shape definition with vertices array
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} rotation - Rotation in degrees
 * @param {number} scale - Scale factor
 * @returns {Array} Transformed polygon vertices
 */
export function getPiecePolygon(shape, x, y, rotation, scale) {
  if (!shape.vertices) {
    console.warn(`Shape ${shape.id} has no vertices defined`);
    return [];
  }

  // Start with base vertices (relative to shape origin)
  let polygon = shape.vertices.map(v => [...v]);

  // Scale from origin
  polygon = scalePolygon(polygon, scale, { x: 0, y: 0 });

  // Get the centroid after scaling (this is the shape's center)
  const centroid = polygonCentroid(polygon);

  // Rotate around the centroid
  polygon = rotatePolygon(polygon, rotation, centroid);

  // Translate so the centroid is at (x, y)
  const dx = x - centroid.x;
  const dy = y - centroid.y;
  polygon = translatePolygon(polygon, dx, dy);

  return polygon;
}

/**
 * Calculate the area of a polygon using the shoelace formula
 * @param {Array} polygon - Array of [x, y] vertices
 * @returns {number} Area (absolute value)
 */
export function polygonArea(polygon) {
  let area = 0;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    area += polygon[j][0] * polygon[i][1];
    area -= polygon[i][0] * polygon[j][1];
  }

  return Math.abs(area / 2);
}

/**
 * Check if a polygon (piece) is mostly inside another polygon (boundary)
 * @param {Array} piece - Piece polygon vertices
 * @param {Array} boundary - Boundary polygon vertices
 * @param {number} threshold - Minimum fraction of piece that must be inside (0-1)
 * @returns {boolean}
 */
export function pieceInsideBoundary(piece, boundary, threshold = 0.8) {
  const pieceBounds = polygonBounds(piece);
  let insideCount = 0;
  let totalCount = 0;
  const samples = 10;

  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const x = pieceBounds.minX + (pieceBounds.maxX - pieceBounds.minX) * (i / (samples - 1));
      const y = pieceBounds.minY + (pieceBounds.maxY - pieceBounds.minY) * (j / (samples - 1));
      const point = { x, y };

      if (pointInPolygon(point, piece)) {
        totalCount++;
        if (pointInPolygon(point, boundary)) {
          insideCount++;
        }
      }
    }
  }

  return totalCount > 0 && (insideCount / totalCount) >= threshold;
}

/**
 * Find the closest edge point on a polygon to a given point
 * @param {Object} point - {x, y}
 * @param {Array} polygon - Array of [x, y] vertices
 * @returns {Object} {x, y, distance, edgeIndex}
 */
export function closestPointOnPolygon(point, polygon) {
  let closestPoint = null;
  let closestDist = Infinity;
  let closestEdge = -1;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    // Project point onto edge
    const edgeX = p2[0] - p1[0];
    const edgeY = p2[1] - p1[1];
    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

    if (edgeLen < 1e-10) continue;

    const t = Math.max(0, Math.min(1, (
      (point.x - p1[0]) * edgeX + (point.y - p1[1]) * edgeY
    ) / (edgeLen * edgeLen)));

    const projX = p1[0] + t * edgeX;
    const projY = p1[1] + t * edgeY;

    const dist = Math.sqrt(
      (point.x - projX) ** 2 + (point.y - projY) ** 2
    );

    if (dist < closestDist) {
      closestDist = dist;
      closestPoint = { x: projX, y: projY };
      closestEdge = i;
    }
  }

  return { ...closestPoint, distance: closestDist, edgeIndex: closestEdge };
}
