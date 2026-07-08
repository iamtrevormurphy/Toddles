import React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';
import { shade } from '../../constants/theme';
import { getShape, getShapeSideColor } from './shapes';
import { getSlotPolygon } from './transforms';
import { extrusionPath, polygonToPath } from './extrusion';

// The puzzle template. Filled slots render as 2.5D extruded pieces in two
// passes — all side geometry first, then all top faces — so a lower piece's
// top always occludes its neighbor's downward extrusion without sorting.
// Empty slots stay FLAT (they're holes, not objects): tinted dashed outlines.
export default function Board({ puzzle, filledSlotIds, size, viewBox }) {
  const slots = puzzle.slots.map((slot, i) => ({
    slot,
    index: i,
    filled: filledSlotIds.includes(i),
    color: getShape(slot.shape).color,
    sideColor: getShapeSideColor(slot.shape),
    polygon: getSlotPolygon(slot),
  }));

  return (
    <Svg width={size} height={size} viewBox={viewBox} pointerEvents="none">
      {/* Pass 1: side geometry for every filled slot */}
      {slots
        .filter((s) => s.filled)
        .map((s) => (
          <Path
            key={`side-${s.index}`}
            d={extrusionPath(s.polygon)}
            fill={s.sideColor}
            stroke={s.sideColor}
            strokeWidth={1}
          />
        ))}
      {/* Pass 2: top faces and flat empty outlines */}
      {slots.map((s) =>
        s.filled ? (
          <Path
            key={`top-${s.index}`}
            d={polygonToPath(s.polygon)}
            fill={s.color}
            stroke={shade(s.color, -0.15)}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ) : (
          <Polygon
            key={`empty-${s.index}`}
            points={s.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={s.color}
            fillOpacity={0.12}
            stroke={s.color}
            strokeOpacity={0.55}
            strokeWidth={2.5}
            strokeDasharray="7 5"
            strokeLinejoin="round"
          />
        )
      )}
    </Svg>
  );
}
