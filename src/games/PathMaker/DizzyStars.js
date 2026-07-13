import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

const STAR = 'M 6 0 L 7.6 4.2 L 12 6 L 7.6 7.8 L 6 12 L 4.4 7.8 L 0 6 L 4.4 4.2 Z';
const STAR_SIZE = 12;

// Three little stars arcing over Lento's head after a bonk — cartoon
// dizzy, strictly one-shot (single staggered sequence, no loops) so it's
// calm, cheap, and screenshot-verifiable. Parent mounts it positioned at
// the character's head and unmounts it on a timer.
function Star({ delay, dx, tint }) {
  const t = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 700 }));
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.9, { duration: 140 }),
        withTiming(0.9, { duration: 320 }),
        withTiming(0, { duration: 240 })
      )
    );
    return () => {
      cancelAnimation(t);
      cancelAnimation(opacity);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: dx * t.value },
      { translateY: -14 - 18 * t.value + 10 * t.value * t.value }, // gentle arc up and over
      { rotate: `${t.value * 140}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.star, style]}>
      <Svg width={STAR_SIZE} height={STAR_SIZE} viewBox={`0 0 ${STAR_SIZE} ${STAR_SIZE}`}>
        <Path d={STAR} fill={tint} />
      </Svg>
    </Animated.View>
  );
}

export default function DizzyStars({ x, y }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.wrapper, { left: x, top: y }]}>
      <Star delay={0} dx={-16} tint={COLORS.bubbleYellow} />
      <Star delay={120} dx={2} tint={COLORS.textDark} />
      <Star delay={240} dx={18} tint={COLORS.bubbleYellow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 20,
  },
  star: {
    position: 'absolute',
    left: -STAR_SIZE / 2,
    top: -STAR_SIZE / 2,
  },
});
