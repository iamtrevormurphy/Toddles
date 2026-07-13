import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, shade } from '../../constants/theme';

export const SNACK_SIZE = 22;

// The bare glyph — also used by the success card's "what Lento ate" row.
export function SnackGlyph({ kind, size = SNACK_SIZE }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${SNACK_SIZE} ${SNACK_SIZE}`}>
      {kind === 'berry' ? (
        <>
          <Path d="M 12 7 Q 13 3 17 3" stroke={COLORS.bubbleGreen} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Circle cx={8} cy={13.5} r={5} fill={COLORS.bubblePink} />
          <Circle cx={14.5} cy={11} r={4.2} fill={shade(COLORS.bubblePink, 0.12)} />
          <Circle cx={6.5} cy={11.8} r={1.1} fill={COLORS.white} opacity={0.7} />
        </>
      ) : (
        <>
          <Path d="M 11 2.5 Q 18.5 8 11 19.5 Q 3.5 8 11 2.5 Z" fill={COLORS.bubbleGreen} />
          <Path d="M 11 5 L 11 17" stroke={shade(COLORS.bubbleGreen, 0.22)} strokeWidth={1.4} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

// A snack sitting on a board tile. Springs in on mount — which doubles as
// the "sprout back" moment when a moonwalk un-eats it. Getting eaten needs
// no exit animation: Lento is standing on the tile, so it vanishes under
// him mid-munch.
export default function BoardSnack({ left, top, kind }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.snack, { left, top }, style]}>
      <SnackGlyph kind={kind} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  snack: {
    position: 'absolute',
    width: SNACK_SIZE,
    height: SNACK_SIZE,
    zIndex: 5,
  },
});
