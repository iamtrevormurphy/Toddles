import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { MARBLE_COLORS, RADII, shade } from '../../constants/theme';
import { MARBLE_SIZE } from './Marble';

const { width, height } = Dimensions.get('window');

// Play area dimensions — marble position math depends on these; the platform
// styling below is paint only.
export const PLAY_AREA = {
  x: 20,
  y: height * 0.35,
  width: width - 40,
  height: height * 0.35,
};

// Calculate initial positions for marbles in the play area
export function getMarblePositions(count) {
  const positions = [];
  const spacing = PLAY_AREA.width / (count + 1);

  for (let i = 0; i < count; i++) {
    positions.push({
      x: PLAY_AREA.x + spacing * (i + 1),
      y: PLAY_AREA.y + PLAY_AREA.height / 2,
    });
  }

  return positions;
}

// Get a random position within the play area
export function getRandomPosition() {
  const padding = 50;
  return {
    x: PLAY_AREA.x + padding + Math.random() * (PLAY_AREA.width - padding * 2),
    y: PLAY_AREA.y + padding + Math.random() * (PLAY_AREA.height - padding * 2),
  };
}

// Get split positions (two marbles side by side)
export function getSplitPositions(originalX, originalY) {
  const offset = 50;
  return [
    { x: originalX - offset, y: originalY },
    { x: originalX + offset, y: originalY },
  ];
}

// Iterative pairwise push-apart so marbles bump aside instead of stacking.
// Pure: returns a new array (same ids/order). Displaced marbles get new x/y,
// and the Marble spring+roll effect makes them visibly roll out of the way.
// pinnedId: the marble the child just placed — it never moves.
export function resolveOverlaps(
  marbles,
  playArea = PLAY_AREA,
  { pinnedId = null, minGap = 4, iterations = 6 } = {}
) {
  const R = MARBLE_SIZE / 2;
  const minDist = MARBLE_SIZE + minGap;
  const items = marbles.map((m) => ({ ...m }));

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      if (a.inSlot) continue;
      for (let j = i + 1; j < items.length; j++) {
        const b = items[j];
        if (b.inSlot) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minDist) continue;
        if (dist < 0.001) {
          // Coincident: separate along a deterministic angle (no Math.random)
          const angle = ((i * 7 + j * 13) % 12) * (Math.PI / 6);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }
        const overlap = minDist - dist;
        const ux = dx / dist;
        const uy = dy / dist;
        const aPinned = a.id === pinnedId;
        const bPinned = b.id === pinnedId;
        const aPush = aPinned ? 0 : bPinned ? overlap : overlap / 2;
        const bPush = bPinned ? 0 : aPinned ? overlap : overlap / 2;
        a.x -= ux * aPush;
        a.y -= uy * aPush;
        b.x += ux * bPush;
        b.y += uy * bPush;
        moved = true;
      }
    }
    for (const m of items) {
      if (m.inSlot || m.id === pinnedId) continue;
      m.x = Math.min(Math.max(m.x, playArea.x + R), playArea.x + playArea.width - R);
      m.y = Math.min(Math.max(m.y, playArea.y + R), playArea.y + playArea.height - R);
    }
    if (!moved) break;
  }

  return items;
}

const PLATFORM_DEPTH = 10;

// The play area as a raised 2.5D platform. The darker bottom band grounds
// it (depth policy — the slot zone sits directly below, so no ground
// ellipses here).
export default function MarbleArea({ children }) {
  const top = MARBLE_COLORS.playArea;
  const bottom = shade(top, 0.22);
  const w = PLAY_AREA.width;
  const h = PLAY_AREA.height;

  return (
    <View style={styles.area} pointerEvents="none">
      <Svg
        width={w}
        height={h + PLATFORM_DEPTH}
        viewBox={`0 0 ${w} ${h + PLATFORM_DEPTH}`}
      >
        <Rect x={0} y={PLATFORM_DEPTH} width={w} height={h} rx={RADII.lg} fill={bottom} />
        <Rect x={0} y={0} width={w} height={h} rx={RADII.lg} fill={top} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: 'absolute',
    left: PLAY_AREA.x,
    top: PLAY_AREA.y,
    width: PLAY_AREA.width,
    height: PLAY_AREA.height + PLATFORM_DEPTH,
  },
});
