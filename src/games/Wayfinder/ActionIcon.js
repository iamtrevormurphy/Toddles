import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

// The four action glyphs, ink on the toy-block button tops. SVG only (the
// no-emoji rule); chunky filled shapes so they read at arm's length for a
// non-reader. All drawn in a 40×40 box.
export default function ActionIcon({ type, size = 40, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {ICONS[type]?.(color)}
    </Svg>
  );
}

const ICONS = {
  // Move: a chunky double chevron marching up-forward over a paw pad.
  move: (color) => (
    <>
      <Path d="M 20 3 L 32 14 L 26 14 L 26 19 L 14 19 L 14 14 L 8 14 Z" fill={color} />
      <Path d="M 14 22 L 26 22 L 26 27 L 14 27 Z" fill={color} opacity={0.55} />
      {/* paw: one pad + three toes */}
      <Path d="M 15 33 A 5 4.4 0 0 1 25 33 L 25 36 L 15 36 Z" fill={color} opacity={0.8} />
      <Rect x={13.4} y={28.6} width={3.6} height={3.6} rx={1.8} fill={color} opacity={0.8} />
      <Rect x={18.2} y={27.2} width={3.6} height={3.6} rx={1.8} fill={color} opacity={0.8} />
      <Rect x={23} y={28.6} width={3.6} height={3.6} rx={1.8} fill={color} opacity={0.8} />
    </>
  ),
  // Bridge: an arch span with plank ticks along the deck.
  bridge: (color) => (
    <>
      <Path d="M 4 30 L 4 12 L 36 12 L 36 30 L 30 30 L 30 26 A 10 10 0 0 0 10 26 L 10 30 Z" fill={color} />
      <Rect x={8} y={5} width={5} height={5} rx={1} fill={color} opacity={0.55} />
      <Rect x={17.5} y={5} width={5} height={5} rx={1} fill={color} opacity={0.55} />
      <Rect x={27} y={5} width={5} height={5} rx={1} fill={color} opacity={0.55} />
    </>
  ),
  // Stairs: three ascending treads.
  stairs: (color) => (
    <Path
      d="M 5 35 L 5 26 L 15 26 L 15 17 L 25 17 L 25 8 L 35 8 L 35 35 Z"
      fill={color}
    />
  ),
  // Tunnel: an arch outline with a dark filled mouth.
  tunnel: (color) => (
    <>
      <Path d="M 4 36 L 4 18 A 16 16 0 0 1 36 18 L 36 36 L 29 36 L 29 20 A 9 9 0 0 0 11 20 L 11 36 Z" fill={color} />
      <Path d="M 11 36 L 11 20 A 9 9 0 0 1 29 20 L 29 36 Z" fill={color} opacity={0.45} />
    </>
  ),
};
