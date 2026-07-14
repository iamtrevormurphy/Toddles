import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { COLORS } from '../../constants/theme';
import { CHARACTER_COLORS } from '../../characters/parts';

// Icon-only per the design's zero-reading-required rule, redrawn as
// chunky FILLED marks (the old thin-stroke arcs read as spirals).
//
// The turn icons are the branded bit: a mini Lento head (fawn block,
// cream face patch, cocoa eye stripes — his identity carrier, no eyes
// needed at this size) with a bold quarter-arc arrow sweeping over it.
// The button doesn't say "go left", it says "turn LENTO this way" —
// exactly what pressing it does. `color` drives the arrows (ink at rest,
// white when a chip highlights terracotta); the head keeps its fixed
// character colors — that IS the branding.
//
// Below ~24px (history chips) the head would muddy into the arc, so the
// glyph auto-simplifies to arc + arrowhead only; the chip's tile color
// stays the small-size differentiator. `hop` is drawn but unused until
// Phase 5's raised tiles.
export default function InstructionIcon({ type, size = 34, color = COLORS.white }) {
  const stroke = { stroke: color, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const detailed = size >= 24;

  if (type === 'step') {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path
          d="M24 6 L40 24 L31 24 L31 40 Q31 42.5 28.5 42.5 L19.5 42.5 Q17 42.5 17 40 L17 24 L8 24 Z"
          fill={color}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === 'turnRight' || type === 'turnLeft') {
    const mirror = type === 'turnLeft';
    // Drawn as turnRight; turnLeft mirrors the whole glyph. The head is
    // horizontally symmetric, so mirroring can't uncanny-fy Lento.
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        style={mirror ? { transform: [{ scaleX: -1 }] } : undefined}
      >
        {/* quarter-arc over Lento's head, ending in a solid arrowhead */}
        <Path d="M24 12 A17 17 0 0 1 41 29" {...stroke} strokeWidth={5} />
        <Path d="M35.5 27 L46.5 27 L41 38 Z" fill={color} />
        {detailed && (
          <>
            {/* mini Lento: fawn head, cream patch, cocoa eye stripes */}
            <Rect x={14} y={23} width={20} height={15} rx={4.5} fill={CHARACTER_COLORS.fawn} />
            <Rect x={16.5} y={26} width={15} height={9.5} rx={2.5} fill={CHARACTER_COLORS.white} />
            <Path
              d="M17.5 29 L23 30 L23 33 L17.5 32.5 Z"
              fill={CHARACTER_COLORS.cocoa}
            />
            <Path
              d="M25 30 L30.5 29 L30.5 32.5 L25 33 Z"
              fill={CHARACTER_COLORS.cocoa}
            />
          </>
        )}
      </Svg>
    );
  }

  // hop (dormant until Phase 5) — weight-matched to the new set
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={14} r={7} fill={color} />
      <Path d="M10 40 L38 40" {...stroke} strokeWidth={5} />
    </Svg>
  );
}
