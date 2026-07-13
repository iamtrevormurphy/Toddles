import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

// Icon-only per the design's zero-reading-required rule. `hop` is drawn
// but unused by the Phase 2 palette — it returns in Phase 5 alongside
// raised tiles.
export default function InstructionIcon({ type, size = 30, color = COLORS.white }) {
  const props = { stroke: color, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  if (type === 'step') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 20 L12 5 M6 11 L12 5 L18 11" {...props} />
      </Svg>
    );
  }
  if (type === 'turnRight') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 8 A7 7 0 1 1 5 17" {...props} />
        <Path d="M2 14 L5 18 L9 15" {...props} />
      </Svg>
    );
  }
  if (type === 'turnLeft') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M19 8 A7 7 0 1 0 19 17" {...props} />
        <Path d="M22 14 L19 18 L15 15" {...props} />
      </Svg>
    );
  }
  // hop
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={7} r={4} fill={color} />
      <Path d="M4 19 L20 19" {...props} />
    </Svg>
  );
}
