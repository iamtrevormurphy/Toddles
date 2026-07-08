import React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';
import { DEPTH, shade } from '../../constants/theme';
import { getShape, getShapeSideColor } from './shapes';
import { getSlotPolygon, getPuzzleBounds } from './transforms';
import { extrusionPath, polygonToPath } from './extrusion';

// The finished picture, all slots solid. Used by the picker cards, the Home
// card art, and the in-game goal card. `extruded` adds the 2.5D treatment
// (picker cards, completion overlay); small goal-diagram uses stay flat.
export default function PuzzlePreview({ puzzle, size, extruded = false }) {
  const bounds = getPuzzleBounds(puzzle);
  const pad = extruded ? 12 + DEPTH.extrude.dy : 12;
  const span = Math.max(bounds.width, bounds.height) + pad * 2;
  const vbX = bounds.minX + bounds.width / 2 - span / 2;
  const vbY = bounds.minY + bounds.height / 2 - span / 2 + (extruded ? DEPTH.extrude.dy / 2 : 0);

  const polygons = puzzle.slots.map((slot) => ({
    polygon: getSlotPolygon(slot),
    color: getShape(slot.shape).color,
    sideColor: getShapeSideColor(slot.shape),
  }));

  return (
    <Svg width={size} height={size} viewBox={`${vbX} ${vbY} ${span} ${span}`} pointerEvents="none">
      {extruded &&
        polygons.map((p, i) => (
          <Path
            key={`side-${i}`}
            d={extrusionPath(p.polygon)}
            fill={p.sideColor}
            stroke={p.sideColor}
            strokeWidth={1}
          />
        ))}
      {polygons.map((p, i) => (
        <Polygon
          key={i}
          points={p.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
          fill={p.color}
          stroke={shade(p.color, -0.15)}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
