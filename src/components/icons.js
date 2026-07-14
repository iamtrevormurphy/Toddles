import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// The app's tiny SVG icon set. Emoji are never used as UI chrome
// (design-direction skill) — add icons here instead.

export function ChevronLeftIcon({ size = 24, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M15 6 L9 12 L15 18"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 24, color = COLORS.white }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 6 L15 12 L9 18"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function RefreshIcon({ size = 24, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M19 12 a7 7 0 1 1 -2.05 -4.95"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M17.2 2.6 L17.2 7.3 L12.5 7.3 Z" fill={color} />
    </Svg>
  );
}

// Broom: sweep the track clean. Distinct from RefreshIcon (which resets a
// whole level) — this only clears the child's in-progress program.
export function BroomIcon({ size = 24, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18 3 L10.5 12.5" stroke={color} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M7 12 L14 12 L16.5 18 L4.5 18 Z" fill={color} />
      <Path
        d="M6.5 18 L5.5 21.5 M9.5 18 L9 21.5 M12.5 18 L13 21.5 M15 18 L16 21.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// "One step back" for Path-Maker's undo button: an arrow hooking back
// left, sized to pair with BroomIcon on the controls row.
export function UndoIcon({ size = 24, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 5.5 L4 9.5 L8 13.5"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M4.8 9.5 L14.5 9.5 A4.75 4.75 0 0 1 14.5 19 L9 19"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// Four-point sparkle star (replaces the old ✦ text glyph)
export function StarIcon({ size = 20, color = COLORS.celebration }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M10 1 C10.8 6 11.5 6.8 17 8.5 C11.5 10.2 10.8 11 10 16 C9.2 11 8.5 10.2 3 8.5 C8.5 6.8 9.2 6 10 1 Z"
        fill={color}
      />
    </Svg>
  );
}

// Difficulty dot row: `level` of 3 dots filled with the action accent.
export function DifficultyDots({ level = 1, size = 6, gap = 5 }) {
  const width = size * 3 + gap * 2;
  return (
    <Svg width={width} height={size} viewBox={`0 0 ${width} ${size}`}>
      {[0, 1, 2].map((i) => (
        <Circle
          key={i}
          cx={size / 2 + i * (size + gap)}
          cy={size / 2}
          r={size / 2}
          fill={i < level ? COLORS.bubbleOrange : 'rgba(62, 58, 94, 0.15)'}
        />
      ))}
    </Svg>
  );
}
