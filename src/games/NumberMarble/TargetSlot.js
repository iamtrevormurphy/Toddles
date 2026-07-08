import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MARBLE_COLORS, shade } from '../../constants/theme';
import { MARBLE_SIZE } from './Marble';

const SLOT_SIZE = MARBLE_SIZE + 20;
// The ring is the "full" marker: the slot marble grows toward it as the sum
// approaches the target, and exactly fills it at the winning sum.
const RING_SIZE = MARBLE_SIZE + 6;

// A recessed socket: darker inner well + goal ring reads as "put it here"
// without any arrow. Pulses sage when a marble hovers near; wobbles on
// overflow. Dashed border only while EMPTY (dashed = empty affordance).
export default function TargetSlot({ isHighlighted = false, hasMarble = false, wobbleKey = 0, x, y }) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.5);
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.5, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      borderOpacity.value = withTiming(0.5, { duration: 200 });
    }
  }, [isHighlighted]);

  // Overflow wobble: fires whenever wobbleKey increments
  useEffect(() => {
    if (wobbleKey > 0) {
      wobble.value = withSequence(
        withTiming(-4, { duration: 70 }),
        withTiming(4, { duration: 90 }),
        withTiming(-3, { duration: 80 }),
        withTiming(0, { duration: 90 })
      );
    }
  }, [wobbleKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${wobble.value}deg` }],
    borderColor: `rgba(127, 169, 140, ${borderOpacity.value})`, // COLORS.success
  }));

  return (
    <Animated.View
      style={[
        styles.slot,
        {
          left: x - SLOT_SIZE / 2,
          top: y - SLOT_SIZE / 2,
        },
        hasMarble && styles.slotOccupied,
        isHighlighted && styles.slotHighlighted,
        animatedStyle,
      ]}
    >
      <View style={styles.well} />
      <View style={styles.ring} />
    </Animated.View>
  );
}

export function getSlotBounds(x, y) {
  return {
    x: x - SLOT_SIZE / 2,
    y: y - SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    centerX: x,
    centerY: y,
  };
}

export { SLOT_SIZE };

const WELL_SIZE = SLOT_SIZE - 22;

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    backgroundColor: MARBLE_COLORS.targetSlot,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderStyle: 'dashed',
  },
  slotOccupied: {
    borderStyle: 'solid',
  },
  slotHighlighted: {
    backgroundColor: MARBLE_COLORS.targetSlotActive,
  },
  well: {
    position: 'absolute',
    width: WELL_SIZE,
    height: WELL_SIZE,
    borderRadius: WELL_SIZE / 2,
    backgroundColor: shade(MARBLE_COLORS.targetSlot, 0.08),
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(62, 58, 94, 0.22)',
  },
});
