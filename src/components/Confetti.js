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

const CONFETTI_COLORS = [
  COLORS.bubblePink,
  COLORS.bubbleBlue,
  COLORS.bubbleYellow,
  COLORS.bubbleGreen,
  COLORS.bubblePurple,
  COLORS.bubbleOrange,
];

const CONFETTI_COUNT = 30;

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
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(600, withTiming(0, { duration: 200 }))
      )
    );

    translateX.value = withDelay(
      delay,
      withTiming(targetX, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
    );

    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(targetY, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(targetY + 200, {
          duration: 400,
          easing: Easing.in(Easing.quad),
        })
      )
    );

    rotation.value = withDelay(
      delay,
      withTiming(rotationTarget, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
    );

    opacity.value = withDelay(
      delay + 600,
      withTiming(0, { duration: 200 }, (finished) => {
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

  const size = 8 + Math.random() * 8;
  const isCircle = index % 3 === 0;

  return (
    <Animated.View
      style={[
        styles.piece,
        animatedStyle,
        {
          left: originX,
          top: originY,
          width: size,
          height: isCircle ? size : size * 0.6,
          borderRadius: isCircle ? size / 2 : 2,
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
