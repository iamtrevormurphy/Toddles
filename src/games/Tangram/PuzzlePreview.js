import React from 'react';
import Svg, { Polygon } from 'react-native-svg';
import { getShape } from './shapes';
import { getSlotPolygon, getPuzzleBounds } from './transforms';

// The finished picture, all slots solid. Used by the picker cards and the
// in-game goal card. The viewBox is fitted to the puzzle so small previews
// stay legible.
export default function PuzzlePreview({ puzzle, size }) {
  const bounds = getPuzzleBounds(puzzle);
  const pad = 12;
  const span = Math.max(bounds.width, bounds.height) + pad * 2;
  const vbX = bounds.minX + bounds.width / 2 - span / 2;
  const vbY = bounds.minY + bounds.height / 2 - span / 2;

  return (
    <Svg width={size} height={size} viewBox={`${vbX} ${vbY} ${span} ${span}`} pointerEvents="none">
      {puzzle.slots.map((slot, i) => (
        <Polygon
          key={i}
          points={getSlotPolygon(slot).map(([x, y]) => `${x},${y}`).join(' ')}
          fill={getShape(slot.shape).color}
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
