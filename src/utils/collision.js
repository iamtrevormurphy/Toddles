// Collision and snap detection utilities

/**
 * Calculate distance between two points
 */
export function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Check if a position is within snap threshold of a target slot
 * Returns the slot if snappable, null otherwise
 */
export function getSnapPosition(currentPos, targetSlots, threshold = 25) {
  for (const slot of targetSlots) {
    if (distance(currentPos, { x: slot.x, y: slot.y }) < threshold) {
      return slot;
    }
  }
  return null;
}

/**
 * Check if two circles/marbles are colliding
 */
export function checkCircleCollision(c1, c2, radius = 40) {
  const dist = distance(c1, c2);
  return dist < radius * 2;
}

/**
 * Check if a point is inside a rectangular area
 */
export function isPointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Find the closest available slot from a list
 */
export function findClosestSlot(position, slots, occupiedSlotIds = []) {
  let closest = null;
  let minDist = Infinity;

  for (const slot of slots) {
    if (occupiedSlotIds.includes(slot.id)) continue;

    const dist = distance(position, { x: slot.x, y: slot.y });
    if (dist < minDist) {
      minDist = dist;
      closest = { slot, distance: dist };
    }
  }

  return closest;
}
