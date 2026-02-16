import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Text,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, TOUCH } from '../../constants/theme';
import { playPopSound, playCelebrationSound } from '../../utils/sound';

const { width, height } = Dimensions.get('window');

// Game constants
const NUMBER_SIZE = 90;
const FALL_DURATION = 6000; // Slower than bubbles - more thinking time
const SPAWN_INTERVAL = 1500;
const MAX_NUMBERS = 6;
const BASKET_Y = height - 280;

// Colors for number bubbles
const NUMBER_COLORS = ['#FF6B9D', '#4ECDC4', '#FFE66D', '#7ED957', '#A28BFE', '#FF9F43'];

// Generate dots layout for a number
const DotsDisplay = ({ count, size = 8, color = '#FFF' }) => {
  const dots = [];
  for (let i = 0; i < count; i++) {
    dots.push(
      <View
        key={i}
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    );
  }
  return <View style={styles.dotsContainer}>{dots}</View>;
};

// Falling number component
const FallingNumber = React.memo(({ item, onCatch }) => {
  const handlePress = () => {
    onCatch(item);
  };

  // Wobble animation
  useEffect(() => {
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(item.wobbleAnim, {
          toValue: 1,
          duration: 800 + Math.random() * 400,
          useNativeDriver: true,
        }),
        Animated.timing(item.wobbleAnim, {
          toValue: 0,
          duration: 800 + Math.random() * 400,
          useNativeDriver: true,
        }),
      ])
    );
    wobble.start();
    return () => wobble.stop();
  }, []);

  const wobbleX = item.wobbleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  return (
    <Animated.View
      style={[
        styles.numberContainer,
        {
          left: item.x,
          transform: [
            { translateY: item.animatedY },
            { translateX: wobbleX },
            { scale: item.animatedScale },
          ],
          opacity: item.animatedOpacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.numberBubble, { backgroundColor: item.color }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.numberText}>{item.value}</Text>
        <DotsDisplay count={item.value} />
      </TouchableOpacity>
    </Animated.View>
  );
});

// Bear character component
const BearCharacter = ({ mood, basketCount, target }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood === 'celebrate') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -20,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 4 }
      ).start();
    }
  }, [mood]);

  const getBearFace = () => {
    switch (mood) {
      case 'celebrate':
        return '🥳';
      case 'oops':
        return '🙈';
      case 'close':
        return '😊';
      default:
        return '🐻';
    }
  };

  return (
    <Animated.View
      style={[styles.bearContainer, { transform: [{ translateY: bounceAnim }] }]}
    >
      <Text style={styles.bearFace}>{getBearFace()}</Text>
      {/* Basket */}
      <View style={styles.basket}>
        <View style={styles.basketInner}>
          {/* Show collected dots in basket */}
          <View style={styles.basketDots}>
            {Array.from({ length: basketCount }).map((_, i) => (
              <View key={i} style={styles.basketDot} />
            ))}
          </View>
        </View>
        <Text style={styles.basketCount}>{basketCount}</Text>
      </View>
    </Animated.View>
  );
};

// Target display component
const TargetDisplay = ({ target, current }) => {
  return (
    <View style={styles.targetContainer}>
      <Text style={styles.targetLabel}>Catch</Text>
      <View style={styles.targetNumber}>
        <Text style={styles.targetValue}>{target}</Text>
        <DotsDisplay count={target} size={10} color={COLORS.bubblePurple} />
      </View>
    </View>
  );
};

// Create a falling number
const createNumber = (id) => {
  const value = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
  return {
    id,
    value,
    x: Math.random() * (width - NUMBER_SIZE - 40) + 20,
    color: NUMBER_COLORS[Math.floor(Math.random() * NUMBER_COLORS.length)],
    animatedY: new Animated.Value(-NUMBER_SIZE),
    animatedScale: new Animated.Value(1),
    animatedOpacity: new Animated.Value(1),
    wobbleAnim: new Animated.Value(0),
  };
};

// Generate a target that's achievable
const generateTarget = () => {
  return Math.floor(Math.random() * 4) + 3; // 3-6
};

export default function NumberCatch({ navigation }) {
  const [numbers, setNumbers] = useState([]);
  const [basketCount, setBasketCount] = useState(0);
  const [target, setTarget] = useState(generateTarget());
  const [score, setScore] = useState(0);
  const [mood, setMood] = useState('normal');
  const [showCelebration, setShowCelebration] = useState(false);
  const [showOops, setShowOops] = useState(false);
  const numberIdRef = useRef(0);
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const oopsScale = useRef(new Animated.Value(0)).current;

  // Spawn numbers
  useEffect(() => {
    const spawnNumber = () => {
      if (numbers.length < MAX_NUMBERS && !showCelebration && !showOops) {
        const newNumber = createNumber(numberIdRef.current++);
        setNumbers((prev) => [...prev, newNumber]);

        // Animate falling
        Animated.timing(newNumber.animatedY, {
          toValue: BASKET_Y,
          duration: FALL_DURATION,
          useNativeDriver: true,
        }).start(() => {
          // Remove when reaches bottom
          setNumbers((prev) => prev.filter((n) => n.id !== newNumber.id));
        });
      }
    };

    // Initial numbers
    setTimeout(() => spawnNumber(), 500);
    setTimeout(() => spawnNumber(), 1200);

    const interval = setInterval(spawnNumber, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, [showCelebration, showOops]);

  // Update mood based on progress
  useEffect(() => {
    if (!showCelebration && !showOops) {
      if (basketCount > 0 && target - basketCount <= 2) {
        setMood('close');
      } else {
        setMood('normal');
      }
    }
  }, [basketCount, target, showCelebration, showOops]);

  // Handle catching a number
  const handleCatch = useCallback(
    (item) => {
      // Animate catch
      Animated.parallel([
        Animated.timing(item.animatedScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(item.animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setNumbers((prev) => prev.filter((n) => n.id !== item.id));
      });

      playPopSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const newCount = basketCount + item.value;

      if (newCount === target) {
        // Perfect! Celebrate!
        setBasketCount(newCount);
        setMood('celebrate');
        setShowCelebration(true);
        setScore((prev) => prev + 1);
        playCelebrationSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.sequence([
          Animated.spring(celebrationScale, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(celebrationScale, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowCelebration(false);
          setBasketCount(0);
          setTarget(generateTarget());
          setMood('normal');
          setNumbers([]);
        });
      } else if (newCount > target) {
        // Oops, too many!
        setBasketCount(newCount);
        setMood('oops');
        setShowOops(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        Animated.sequence([
          Animated.spring(oopsScale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.delay(1200),
          Animated.timing(oopsScale, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowOops(false);
          setBasketCount(0);
          setMood('normal');
          setNumbers([]);
        });
      } else {
        // Keep going
        setBasketCount(newCount);
      }
    },
    [basketCount, target]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{score}</Text>
        <Text style={styles.scoreLabel}>rounds!</Text>
      </View>

      {/* Target */}
      <TargetDisplay target={target} current={basketCount} />

      {/* Falling numbers */}
      {numbers.map((num) => (
        <FallingNumber key={num.id} item={num} onCatch={handleCatch} />
      ))}

      {/* Bear with basket */}
      <BearCharacter mood={mood} basketCount={basketCount} target={target} />

      {/* Celebration overlay */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.overlay,
            { transform: [{ scale: celebrationScale }] },
          ]}
        >
          <Text style={styles.overlayEmoji}>🎉</Text>
          <Text style={styles.overlayText}>Perfect!</Text>
        </Animated.View>
      )}

      {/* Oops overlay */}
      {showOops && (
        <Animated.View
          style={[
            styles.overlay,
            { transform: [{ scale: oopsScale }] },
          ]}
        >
          <Text style={styles.overlayEmoji}>🙊</Text>
          <Text style={styles.oopsText}>Too many!</Text>
          <Text style={styles.tryAgainText}>Try again!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9', // Soft green forest-y background
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: TOUCH.minTargetSize,
    height: TOUCH.minTargetSize,
    borderRadius: TOUCH.minTargetSize / 2,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 32,
    color: COLORS.textDark,
  },
  scoreContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  scoreLabel: {
    fontSize: 18,
    color: COLORS.textLight,
  },
  targetContainer: {
    alignItems: 'center',
    marginTop: 120,
  },
  targetLabel: {
    fontSize: 28,
    color: COLORS.textDark,
  },
  targetNumber: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  targetValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.bubblePurple,
  },
  numberContainer: {
    position: 'absolute',
    width: NUMBER_SIZE,
    height: NUMBER_SIZE,
  },
  numberBubble: {
    width: NUMBER_SIZE,
    height: NUMBER_SIZE,
    borderRadius: NUMBER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  numberText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 60,
    marginTop: 4,
  },
  dot: {
    margin: 2,
  },
  bearContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bearFace: {
    fontSize: 80,
  },
  basket: {
    marginTop: -10,
    alignItems: 'center',
  },
  basketInner: {
    width: 120,
    height: 70,
    backgroundColor: '#8B4513',
    borderRadius: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#654321',
    borderTopWidth: 0,
  },
  basketDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 8,
    maxWidth: 100,
  },
  basketDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFE66D',
    margin: 3,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  basketCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlay: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  overlayEmoji: {
    fontSize: 100,
  },
  overlayText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 10,
  },
  oopsText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 10,
  },
  tryAgainText: {
    fontSize: 28,
    color: COLORS.textLight,
    marginTop: 5,
  },
});
