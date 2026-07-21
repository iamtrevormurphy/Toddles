import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, SPACING, TYPE } from '../constants/theme';
import { useReducedMotion } from '../utils/motion';
import { ChevronRightIcon } from './icons';
import PrimaryButton from './PrimaryButton';

// The one shared "level complete" affordance across every game: a rounded
// bar that springs up along the BOTTOM of the screen — never a full-screen
// dim overlay. The character celebrates on the board above, fully visible
// and unobscured, which is the whole point of the payoff. Replaces the
// per-game completeOverlay/completeCard modals.
//
// Props:
//   visible       gate (usually a ~1400ms-delayed state so the dance reads first)
//   message       the win line, e.g. "Goal reached!" or `${puzzle.name}!`
//   messageColor  defaults to sage success; games may pass their own hue
//   onNext        advance to the next level/puzzle
//   nextLabel     defaults to "Next"
//   secondaryLabel/onSecondary   optional text-only action (Tangram "More pictures")
//   accessory     optional node above the message (PathMaker's eaten-snack row)
export default function SuccessBar({
  visible,
  message,
  messageColor = COLORS.success,
  onNext,
  nextLabel = 'Next',
  secondaryLabel = null,
  onSecondary = null,
  accessory = null,
}) {
  const reduced = useReducedMotion();
  const rise = useSharedValue(reduced ? 0 : 60);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (!visible) return undefined;
    fade.value = withTiming(1, { duration: reduced ? 120 : 250 });
    rise.value = reduced
      ? withTiming(0, { duration: 120 })
      : withSpring(0, { damping: 20, stiffness: 200 });
    return () => {
      cancelAnimation(rise);
      cancelAnimation(fade);
    };
  }, [visible, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: rise.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="box-none">
      <View style={styles.bar}>
        {accessory}
        <Text style={[styles.message, { color: messageColor }]}>{message}</Text>
        <PrimaryButton label={nextLabel} icon={<ChevronRightIcon size={26} />} onPress={onNext} />
        {secondaryLabel && (
          <TouchableOpacity onPress={onSecondary} hitSlop={10} activeOpacity={0.7}>
            <Text style={styles.secondary}>{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    zIndex: 300,
  },
  bar: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.xl,
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginHorizontal: 20,
    maxWidth: 420,
    alignItems: 'center',
    gap: SPACING[3],
    ...SHADOWS.floating,
  },
  message: {
    ...TYPE.title,
    textAlign: 'center',
  },
  secondary: {
    ...TYPE.label,
    fontSize: 15,
    color: COLORS.textLight,
    paddingVertical: 4,
  },
});
