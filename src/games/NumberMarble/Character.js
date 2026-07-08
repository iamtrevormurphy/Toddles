import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { MARBLE_COLORS } from '../../constants/theme';

const AnimatedView = Animated.View;

export default function Character({ targetNumber, isDancing = false, size = 120 }) {
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  // Idle bobbing animation
  useEffect(() => {
    if (!isDancing) {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      rotation.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isDancing]);

  // Dance animation
  useEffect(() => {
    if (isDancing) {
      // Bounce
      translateY.value = withRepeat(
        withSequence(
          withSpring(-20, { damping: 3, stiffness: 200 }),
          withSpring(0, { damping: 3, stiffness: 200 })
        ),
        4,
        true
      );

      // Wiggle
      rotation.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 100 }),
          withTiming(10, { duration: 100 }),
          withTiming(0, { duration: 100 })
        ),
        4,
        true
      );

      // Scale pulse
      scale.value = withRepeat(
        withSequence(
          withSpring(1.1, { damping: 4 }),
          withSpring(1, { damping: 4 })
        ),
        4,
        true
      );
    }
  }, [isDancing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <AnimatedView style={[styles.characterContainer, animatedStyle]}>
        {/* Robot character SVG */}
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Antenna */}
          <Rect x="47" y="5" width="6" height="12" fill="#888" rx="2" />
          <Circle cx="50" cy="5" r="5" fill="#FF6B6B" />

          {/* Head */}
          <Rect x="25" y="17" width="50" height="40" fill="#5C7AEA" rx="8" />

          {/* Eyes */}
          <Circle cx="38" cy="35" r="8" fill="#FFF" />
          <Circle cx="62" cy="35" r="8" fill="#FFF" />
          <Circle cx="38" cy="35" r="4" fill="#333" />
          <Circle cx="62" cy="35" r="4" fill="#333" />

          {/* Eye shine */}
          <Circle cx="40" cy="33" r="2" fill="#FFF" />
          <Circle cx="64" cy="33" r="2" fill="#FFF" />

          {/* Mouth */}
          <Rect x="35" y="47" width="30" height="5" fill="#333" rx="2" />

          {/* Body */}
          <Rect x="30" y="60" width="40" height="30" fill="#5C7AEA" rx="5" />

          {/* Chest light */}
          <Circle cx="50" cy="72" r="6" fill={isDancing ? '#7ED957' : '#FFE66D'} />

          {/* Arms */}
          <Rect x="15" y="62" width="12" height="20" fill="#5C7AEA" rx="4" />
          <Rect x="73" y="62" width="12" height="20" fill="#5C7AEA" rx="4" />

          {/* Hands */}
          <Circle cx="21" cy="85" r="6" fill="#888" />
          <Circle cx="79" cy="85" r="6" fill="#888" />

          {/* Blush when dancing */}
          {isDancing && (
            <>
              <Ellipse cx="30" cy="42" rx="5" ry="3" fill="#FFB6C1" opacity={0.7} />
              <Ellipse cx="70" cy="42" rx="5" ry="3" fill="#FFB6C1" opacity={0.7} />
            </>
          )}
        </Svg>

        {/* Target number card */}
        <View style={styles.targetCard}>
          <Text style={styles.targetNumber}>{targetNumber}</Text>
        </View>

        {/* Sparkles when dancing */}
        {isDancing && (
          <>
            <Sparkle x={-10} y={-20} delay={0} />
            <Sparkle x={size + 10} y={-10} delay={100} />
            <Sparkle x={size / 2} y={-30} delay={200} />
          </>
        )}
      </AnimatedView>
    </View>
  );
}

// Sparkle component for dance animation
function Sparkle({ x, y, delay }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        true
      );

      scale.value = withRepeat(
        withSequence(
          withSpring(1.2),
          withSpring(0.8)
        ),
        -1,
        true
      );
    };

    const timeout = setTimeout(animate, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView
      style={[
        styles.sparkle,
        { left: x, top: y },
        animatedStyle,
      ]}
    >
      <Text style={styles.sparkleText}>✨</Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 20,
  },
  characterContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  targetCard: {
    position: 'absolute',
    bottom: -15,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: MARBLE_COLORS.marble,
  },
  targetNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: MARBLE_COLORS.marble,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleText: {
    fontSize: 24,
  },
});
