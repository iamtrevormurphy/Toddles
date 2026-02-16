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

// Shape definitions
const SHAPES = [
  { type: 'circle', label: 'Circles', color: '#FF6B9D' },
  { type: 'square', label: 'Squares', color: '#4ECDC4' },
  { type: 'triangle', label: 'Triangles', color: '#FFE66D' },
];

const SHAPE_SIZE = 70;
const SHAPES_PER_ROUND = 12;
const TARGET_COUNT = 4; // How many of the target shape per round

// Create floating shapes for a round
const createShapesForRound = (targetType) => {
  const shapes = [];
  let id = 0;

  // Add target shapes
  for (let i = 0; i < TARGET_COUNT; i++) {
    const shapeInfo = SHAPES.find(s => s.type === targetType);
    shapes.push({
      id: id++,
      type: targetType,
      color: shapeInfo.color,
      x: Math.random() * (width - SHAPE_SIZE - 40) + 20,
      y: 200 + Math.random() * (height - 450),
      wobbleOffset: Math.random() * Math.PI * 2,
      animatedScale: new Animated.Value(1),
      animatedOpacity: new Animated.Value(1),
      popped: false,
    });
  }

  // Add other shapes
  const otherTypes = SHAPES.filter(s => s.type !== targetType);
  for (let i = TARGET_COUNT; i < SHAPES_PER_ROUND; i++) {
    const shapeInfo = otherTypes[Math.floor(Math.random() * otherTypes.length)];
    shapes.push({
      id: id++,
      type: shapeInfo.type,
      color: shapeInfo.color,
      x: Math.random() * (width - SHAPE_SIZE - 40) + 20,
      y: 200 + Math.random() * (height - 450),
      wobbleOffset: Math.random() * Math.PI * 2,
      animatedScale: new Animated.Value(1),
      animatedOpacity: new Animated.Value(1),
      popped: false,
    });
  }

  return shapes.sort(() => Math.random() - 0.5);
};

// Individual shape component
const FloatingShape = React.memo(({ shape, onTap, isTarget }) => {
  const wobbleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle floating wobble
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(wobbleAnim, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(wobbleAnim, {
          toValue: 0,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ])
    );
    wobble.start();
    return () => wobble.stop();
  }, []);

  const translateY = wobbleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  const translateX = wobbleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-5, 5, -5],
  });

  const renderShape = () => {
    switch (shape.type) {
      case 'circle':
        return (
          <View style={[styles.circle, { backgroundColor: shape.color }]}>
            <View style={styles.shine} />
          </View>
        );
      case 'square':
        return (
          <View style={[styles.square, { backgroundColor: shape.color }]}>
            <View style={styles.shine} />
          </View>
        );
      case 'triangle':
        return (
          <View style={styles.triangleWrapper}>
            <View style={[styles.triangle, { borderBottomColor: shape.color }]} />
          </View>
        );
      default:
        return null;
    }
  };

  if (shape.popped) return null;

  return (
    <Animated.View
      style={[
        styles.shapeContainer,
        {
          left: shape.x,
          top: shape.y,
          transform: [
            { translateX },
            { translateY },
            { scale: shape.animatedScale },
          ],
          opacity: shape.animatedOpacity,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onTap(shape)}
        activeOpacity={0.8}
        style={styles.shapeTouchable}
      >
        {renderShape()}
      </TouchableOpacity>
    </Animated.View>
  );
});

// Target indicator at top
const TargetBanner = ({ targetShape, remaining, total }) => {
  const shapeInfo = SHAPES.find(s => s.type === targetShape);

  const renderTargetIcon = () => {
    const size = 50;
    switch (targetShape) {
      case 'circle':
        return (
          <View style={[styles.bannerCircle, { backgroundColor: shapeInfo.color }]} />
        );
      case 'square':
        return (
          <View style={[styles.bannerSquare, { backgroundColor: shapeInfo.color }]} />
        );
      case 'triangle':
        return (
          <View style={[styles.bannerTriangle, { borderBottomColor: shapeInfo.color }]} />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Tap the</Text>
      <View style={styles.bannerTarget}>
        {renderTargetIcon()}
        <Text style={[styles.bannerLabel, { color: shapeInfo.color }]}>
          {shapeInfo.label}!
        </Text>
      </View>
      <View style={styles.progressDots}>
        {[...Array(total)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i < (total - remaining) ? shapeInfo.color : '#DDD' }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export default function ShapeSorter({ navigation }) {
  const [shapes, setShapes] = useState([]);
  const [targetShape, setTargetShape] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationScale = useRef(new Animated.Value(0)).current;

  // Start a new round
  const startNewRound = useCallback(() => {
    const newTarget = SHAPES[Math.floor(Math.random() * SHAPES.length)].type;
    const newShapes = createShapesForRound(newTarget);
    setTargetShape(newTarget);
    setShapes(newShapes);
    setRemaining(TARGET_COUNT);
    setRound(r => r + 1);
  }, []);

  // Initialize first round
  useEffect(() => {
    startNewRound();
  }, []);

  // Handle shape tap
  const handleShapeTap = useCallback((shape) => {
    if (shape.type === targetShape && !shape.popped) {
      // Correct! Pop it
      playPopSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animate pop
      Animated.parallel([
        Animated.timing(shape.animatedScale, {
          toValue: 1.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(shape.animatedOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Mark as popped
      setShapes(prev => prev.map(s =>
        s.id === shape.id ? { ...s, popped: true } : s
      ));

      setScore(s => s + 1);
      setRemaining(r => {
        const newRemaining = r - 1;
        if (newRemaining === 0) {
          // Round complete!
          setTimeout(() => {
            setShowCelebration(true);
            playCelebrationSound();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Animated.sequence([
              Animated.spring(celebrationScale, {
                toValue: 1,
                friction: 3,
                tension: 100,
                useNativeDriver: true,
              }),
              Animated.delay(1200),
              Animated.timing(celebrationScale, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setShowCelebration(false);
              startNewRound();
            });
          }, 200);
        }
        return newRemaining;
      });
    } else if (shape.type !== targetShape) {
      // Wrong shape - gentle wiggle feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      Animated.sequence([
        Animated.timing(shape.animatedScale, {
          toValue: 0.9,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shape.animatedScale, {
          toValue: 1.1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shape.animatedScale, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [targetShape, startNewRound]);

  if (!targetShape) return null;

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
        <Text style={styles.scoreLabel}>popped!</Text>
      </View>

      {/* Target banner */}
      <TargetBanner
        targetShape={targetShape}
        remaining={remaining}
        total={TARGET_COUNT}
      />

      {/* Floating shapes */}
      {shapes.map((shape) => (
        <FloatingShape
          key={shape.id}
          shape={shape}
          onTap={handleShapeTap}
          isTarget={shape.type === targetShape}
        />
      ))}

      {/* Celebration */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebration,
            { transform: [{ scale: celebrationScale }] },
          ]}
        >
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationText}>Great job!</Text>
          <Text style={styles.celebrationSubtext}>Round {round} complete!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
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
  banner: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  bannerText: {
    fontSize: 28,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  bannerTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bannerLabel: {
    fontSize: 36,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  bannerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  bannerSquare: {
    width: 45,
    height: 45,
    borderRadius: 8,
  },
  bannerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 45,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  progressDots: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 8,
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  shapeContainer: {
    position: 'absolute',
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
  },
  shapeTouchable: {
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: SHAPE_SIZE - 10,
    height: SHAPE_SIZE - 10,
    borderRadius: (SHAPE_SIZE - 10) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  square: {
    width: SHAPE_SIZE - 10,
    height: SHAPE_SIZE - 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  triangleWrapper: {
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: (SHAPE_SIZE - 10) / 2,
    borderRightWidth: (SHAPE_SIZE - 10) / 2,
    borderBottomWidth: SHAPE_SIZE - 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  shine: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  celebration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 200,
  },
  celebrationEmoji: {
    fontSize: 100,
  },
  celebrationText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 10,
  },
  celebrationSubtext: {
    fontSize: 24,
    color: COLORS.textLight,
    marginTop: 5,
  },
});
