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
const FALL_DURATION = 6000;
const SPAWN_INTERVAL = 1500;
const MAX_NUMBERS = 6;
const BASKET_Y = height - 320;

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

// Nice basket component with woven look
const Basket = ({ currentCount, targetCount }) => {
  const progress = currentCount / targetCount;

  return (
    <View style={styles.basketWrapper}>
      {/* Basket rim */}
      <View style={styles.basketRim}>
        <View style={styles.rimHighlight} />
      </View>

      {/* Basket body */}
      <View style={styles.basketBody}>
        {/* Woven pattern lines */}
        <View style={styles.wovenPattern}>
          {[...Array(5)].map((_, i) => (
            <View key={`h-${i}`} style={[styles.wovenLineH, { top: 8 + i * 14 }]} />
          ))}
          {[...Array(8)].map((_, i) => (
            <View key={`v-${i}`} style={[styles.wovenLineV, { left: 12 + i * 18 }]} />
          ))}
        </View>

        {/* Progress fill */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressFill,
              { height: `${Math.min(progress * 100, 100)}%` }
            ]}
          />
        </View>

        {/* Count display */}
        <View style={styles.countDisplay}>
          <Text style={styles.currentCount}>{currentCount}</Text>
          <Text style={styles.countDivider}>/</Text>
          <Text style={styles.targetCount}>{targetCount}</Text>
        </View>

        {/* Collected dots visualization */}
        <View style={styles.collectedDots}>
          {[...Array(currentCount)].map((_, i) => (
            <View key={i} style={styles.collectedDot} />
          ))}
        </View>
      </View>

      {/* Basket shadow */}
      <View style={styles.basketShadow} />
    </View>
  );
};

// Bear character component
const BearCharacter = ({ mood, basketCount, target }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood === 'celebrate') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -15,
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
      {/* Bear holding basket */}
      <View style={styles.bearRow}>
        {/* Left paw */}
        <Text style={styles.paw}>🐾</Text>

        {/* Basket */}
        <Basket currentCount={basketCount} targetCount={target} />

        {/* Right paw */}
        <Text style={styles.paw}>🐾</Text>
      </View>

      {/* Bear face below basket */}
      <Text style={styles.bearFace}>{getBearFace()}</Text>
    </Animated.View>
  );
};

// Create a falling number
const createNumber = (id) => {
  const value = Math.floor(Math.random() * 3) + 1;
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

  useEffect(() => {
    const spawnNumber = () => {
      if (numbers.length < MAX_NUMBERS && !showCelebration && !showOops) {
        const newNumber = createNumber(numberIdRef.current++);
        setNumbers((prev) => [...prev, newNumber]);

        Animated.timing(newNumber.animatedY, {
          toValue: BASKET_Y,
          duration: FALL_DURATION,
          useNativeDriver: true,
        }).start(() => {
          setNumbers((prev) => prev.filter((n) => n.id !== newNumber.id));
        });
      }
    };

    setTimeout(() => spawnNumber(), 500);
    setTimeout(() => spawnNumber(), 1200);

    const interval = setInterval(spawnNumber, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, [showCelebration, showOops]);

  useEffect(() => {
    if (!showCelebration && !showOops) {
      if (basketCount > 0 && target - basketCount <= 2) {
        setMood('close');
      } else {
        setMood('normal');
      }
    }
  }, [basketCount, target, showCelebration, showOops]);

  const handleCatch = useCallback(
    (item) => {
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

      {/* Instruction hint */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>Tap numbers to fill the basket!</Text>
      </View>

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
    backgroundColor: '#E8F5E9',
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
  hintContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  hintText: {
    fontSize: 20,
    color: COLORS.textLight,
    fontWeight: '500',
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
  // Bear styles
  bearContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bearRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paw: {
    fontSize: 36,
    marginHorizontal: -5,
    marginBottom: 20,
  },
  bearFace: {
    fontSize: 70,
    marginTop: -15,
  },
  // Basket styles
  basketWrapper: {
    alignItems: 'center',
  },
  basketRim: {
    width: 160,
    height: 20,
    backgroundColor: '#D2691E',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#8B4513',
    overflow: 'hidden',
    zIndex: 2,
  },
  rimHighlight: {
    position: 'absolute',
    top: 2,
    left: 10,
    right: 10,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  basketBody: {
    width: 150,
    height: 100,
    backgroundColor: '#DEB887',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 4,
    borderTopWidth: 0,
    borderColor: '#CD853F',
    marginTop: -4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wovenPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wovenLineH: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#C4A574',
    borderRadius: 1,
  },
  wovenLineV: {
    position: 'absolute',
    top: 4,
    bottom: 8,
    width: 3,
    backgroundColor: '#B8956E',
    borderRadius: 1,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
  },
  progressFill: {
    backgroundColor: 'rgba(126, 217, 87, 0.4)',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  countDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    zIndex: 10,
  },
  currentCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#5D4037',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  countDivider: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8D6E63',
    marginHorizontal: 4,
  },
  targetCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8D6E63',
  },
  collectedDots: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 120,
  },
  collectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    margin: 2,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  basketShadow: {
    width: 130,
    height: 15,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 65,
    marginTop: 5,
  },
  overlay: {
    position: 'absolute',
    top: '30%',
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
