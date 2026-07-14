import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, DEPTH, PATHMAKER_COLORS, RADII, shade } from '../../constants/theme';
import InstructionIcon from './InstructionIcon';
import { CHIP_SIZE } from './trackLayout';

const CHIP_COLORS = {
  step: PATHMAKER_COLORS.tileStep,
  turnLeft: PATHMAKER_COLORS.tileTurnLeft,
  turnRight: PATHMAKER_COLORS.tileTurnRight,
  hop: PATHMAKER_COLORS.tileStep,
};

// One executed action in the history trail. Purely presentational —
// pointerEvents none, no gestures (undo is a real button now). The newest
// chip reads emphasized (full opacity, slight scale-up); older chips fade
// back as committed history. Exit animations are fire-and-forget: the
// runner prunes track state on its own later() schedule, never from an
// animation-completion callback.
//   leaving: null | 'eject' (failure theater pop-out) | 'undo' (shrink)
export default function HistoryChip({ type, x, isNewest, isActive, isPulsing, leaving }) {
  const cx = useSharedValue(x);
  const scale = useSharedValue(0); // spring-in on mount
  const bump = useSharedValue(isNewest ? 1.1 : 1);
  const fade = useSharedValue(isNewest ? 1 : 0.55);
  const rise = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 220 });
  }, []);

  // Window slide: chips spring left when the rolling window advances.
  useEffect(() => {
    cx.value = withSpring(x, { damping: 20, stiffness: 200 });
  }, [x]);

  useEffect(() => {
    bump.value = withTiming(isNewest ? 1.1 : 1, { duration: 200 });
    fade.value = withTiming(isNewest ? 1 : 0.55, { duration: 200 });
  }, [isNewest]);

  // Theater pulse on the at-fault chip (withRepeat survives re-render
  // commits on web, unlike withSequence — see GameScreen's runner notes).
  useEffect(() => {
    if (isPulsing) {
      pulse.value = withRepeat(withTiming(1.15, { duration: 400 }), -1, true);
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
    return () => cancelAnimation(pulse);
  }, [isPulsing]);

  useEffect(() => {
    if (leaving === 'eject') {
      rise.value = withTiming(-24, { duration: 280 });
      scale.value = withTiming(0, { duration: 300 });
    } else if (leaving === 'undo') {
      scale.value = withTiming(0, { duration: 150 });
    }
  }, [leaving]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: cx.value - CHIP_SIZE / 2 },
      { translateY: rise.value },
      { scale: scale.value * bump.value * pulse.value },
    ],
  }));

  const highlighted = isActive || isPulsing;
  const topColor = highlighted ? COLORS.bubbleOrange : CHIP_COLORS[type] ?? COLORS.white;

  return (
    <Animated.View style={[styles.chip, style]} pointerEvents="none">
      <View style={[styles.band, { backgroundColor: shade(topColor, DEPTH.sideShade) }]} />
      <View style={[styles.face, { backgroundColor: topColor }]}>
        <InstructionIcon
          type={type}
          size={20}
          color={highlighted ? COLORS.white : COLORS.textDark}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CHIP_SIZE,
    height: CHIP_SIZE,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Miniature contact band — a 3px hint of the toy-block depth, not the
  // full slab (chips are history, palette buttons are the toys).
  band: {
    position: 'absolute',
    top: 3,
    left: 0,
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: RADII.sm,
  },
});
