import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Four soft pastels, per the design-direction skill (restraint over rainbow)
const CONFETTI_COLORS = [
  COLORS.bubblePink,
  COLORS.bubbleYellow,
  COLORS.bubbleGreen,
  COLORS.bubblePurple,
];

const CONFETTI_COUNT = 18;

function ConfettiPiece({ index, originX, originY, onComplete }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const angle = (index / CONFETTI_COUNT) * Math.PI * 2 + Math.random() * 0.5;
  const velocity = 150 + Math.random() * 150;
  const targetX = Math.cos(angle) * velocity;
  const targetY = Math.sin(angle) * velocity - 100; // Bias upward initially
  const rotationTarget = Math.random() * 720 - 360;
  const delay = Math.random() * 100;

  useEffect(() => {
    // Calm drift: ~30% slower than the original burst, fading out early
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 130 }),
        withDelay(700, withTiming(0, { duration: 300 }))
      )
    );

    translateX.value = withDelay(
      delay,
      withTiming(targetX, {
        duration: 1050,
        easing: Easing.out(Easing.cubic),
      })
    );

    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(targetY, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(targetY + 200, {
          duration: 530,
          easing: Easing.in(Easing.quad),
        })
      )
    );

    rotation.value = withDelay(
      delay,
      withTiming(rotationTarget, {
        duration: 1050,
        easing: Easing.out(Easing.cubic),
      })
    );

    opacity.value = withDelay(
      delay + 650,
      withTiming(0, { duration: 350 }, (finished) => {
        if (finished && index === 0) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  // Soft petals: circles and rounded ovals only, no hard rectangles
  const size = 8 + Math.random() * 6;
  const isCircle = index % 3 === 0;
  const height = isCircle ? size : size * 0.65;

  return (
    <Animated.View
      style={[
        styles.piece,
        animatedStyle,
        {
          left: originX,
          top: originY,
          width: size,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export default function Confetti({ visible, originX = width / 2, originY = height / 2, onComplete = () => {} }) {
  if (!visible) return null;

  return (
    <>
      {Array.from({ length: CONFETTI_COUNT }).map((_, index) => (
        <ConfettiPiece
          key={index}
          index={index}
          originX={originX}
          originY={originY}
          onComplete={onComplete}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    zIndex: 1000,
  },
});
