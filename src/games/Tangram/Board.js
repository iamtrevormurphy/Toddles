import React from 'react';
import Svg, { Polygon } from 'react-native-svg';
import { getShape } from './shapes';
import { getSlotPolygon } from './transforms';

// The puzzle template: every slot rendered as a color-hinted dashed outline,
// switching to a solid fill once its piece lands. Non-interactive — the SVG
// viewBox does all the puzzle-space -> screen scaling.
export default function Board({ puzzle, filledSlotIds, size, viewBox }) {
  return (
    <Svg width={size} height={size} viewBox={viewBox} pointerEvents="none">
      {puzzle.slots.map((slot, i) => {
        const color = getShape(slot.shape).color;
        const points = getSlotPolygon(slot)
          .map(([x, y]) => `${x},${y}`)
          .join(' ');
        if (filledSlotIds.includes(i)) {
          return (
            <Polygon
              key={i}
              points={points}
              fill={color}
              stroke="#FFFFFF"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          );
        }
        return (
          <Polygon
            key={i}
            points={points}
            fill={color}
            fillOpacity={0.18}
            stroke={color}
            strokeWidth={2.5}
            strokeDasharray="7 5"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}
