import React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';
import { TANGRAM_COLORS, shade } from '../../constants/theme';
import { getShape, getShapeSideColor } from './shapes';
import { getSlotPolygon } from './transforms';
import { extrusionPath, polygonToPath } from './extrusion';

// The puzzle template. Filled slots render as 2.5D extruded pieces in two
// passes — all side geometry first, then all top faces — so a lower piece's
// top always occludes its neighbor's downward extrusion without sorting.
// Empty slots stay FLAT (they're holes, not objects) and render per the
// difficulty ladder:
//   basic    — tinted fill + dotted outline per slot (shape color hints)
//   normal   — tinted fill only, no outline (color is the remaining hint)
//   advanced — the remaining picture as ONE seamless light silhouette,
//              no per-slot boundaries at all
export default function Board({ puzzle, filledSlotIds, size, viewBox, renderMode = 'basic' }) {
  const slots = puzzle.slots.map((slot, i) => ({
    slot,
    index: i,
    filled: filledSlotIds.includes(i),
    color: getShape(slot.shape).color,
    sideColor: getShapeSideColor(slot.shape),
    polygon: getSlotPolygon(slot),
  }));
  const emptySlots = slots.filter((s) => !s.filled);

  return (
    <Svg width={size} height={size} viewBox={viewBox} pointerEvents="none">
      {/* Pass 0 (advanced only): still-empty slots as one flat silhouette.
          A single Path of subpaths; the identical opaque fill + stroke
          overdraws antialiasing hairlines on shared slot edges, so the
          picture reads as one seamless shape. Drawn first so settled
          pieces' extrusions occlude it. */}
      {renderMode === 'advanced' && emptySlots.length > 0 && (
        <Path
          d={emptySlots.map((s) => polygonToPath(s.polygon)).join(' ')}
          fill={TANGRAM_COLORS.silhouette}
          stroke={TANGRAM_COLORS.silhouette}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
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
      {/* Pass 2: top faces and flat empty hints (basic/normal) */}
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
        ) : renderMode === 'advanced' ? null : (
          <Polygon
            key={`empty-${s.index}`}
            points={s.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={s.color}
            fillOpacity={renderMode === 'normal' ? 0.18 : 0.12}
            {...(renderMode === 'basic'
              ? {
                  stroke: s.color,
                  strokeOpacity: 0.55,
                  strokeWidth: 2.5,
                  strokeDasharray: '7 5',
                  strokeLinejoin: 'round',
                }
              : null)}
          />
        )
      )}
    </Svg>
  );
}
