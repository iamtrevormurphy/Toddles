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
const CONVEYOR_Y = 200;
const SHAPE_SIZE = 70;
const BIN_SIZE = 100;
const BIN_Y = height - 280;
const CONVEYOR_SPEED = 4000;
const SPAWN_INTERVAL = 2000;
const CATCH_ZONE_WIDTH = 100;

// Shape definitions
const SHAPES = [
  { type: 'circle', color: '#FF6B9D', label: 'Circle' },
  { type: 'square', color: '#4ECDC4', label: 'Square' },
  { type: 'triangle', color: '#FFE66D', label: 'Triangle' },
];

// Calculate bin positions (evenly spaced)
const BIN_POSITIONS = SHAPES.map((_, index) => {
  const totalWidth = SHAPES.length * BIN_SIZE + (SHAPES.length - 1) * 20;
  const startX = (width - totalWidth) / 2;
  return startX + index * (BIN_SIZE + 20) + BIN_SIZE / 2;
});

// Shape component on conveyor
const ConveyorShape = React.memo(({ shape, onMissed, onPositionUpdate }) => {
  useEffect(() => {
    // Track position via listener
    const listenerId = shape.animatedX.addListener(({ value }) => {
      onPositionUpdate(shape.id, value);
    });

    // Start moving animation
    Animated.timing(shape.animatedX, {
      toValue: width + SHAPE_SIZE,
      duration: CONVEYOR_SPEED,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onMissed(shape);
      }
    });

    return () => {
      shape.animatedX.removeListener(listenerId);
    };
  }, []);

  const renderShape = () => {
    switch (shape.type) {
      case 'circle':
        return (
          <View style={[styles.shapeCircle, { backgroundColor: shape.color }]}>
            <View style={styles.shapeShine} />
          </View>
        );
      case 'square':
        return (
          <View style={[styles.shapeSquare, { backgroundColor: shape.color }]}>
            <View style={styles.shapeShine} />
          </View>
        );
      case 'triangle':
        return (
          <View style={styles.triangleWrapper}>
            <View style={[styles.shapeTriangle, { borderBottomColor: shape.color }]} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.conveyorShape,
        {
          transform: [
            { translateX: shape.animatedX },
            { scale: shape.animatedScale },
          ],
          opacity: shape.animatedOpacity,
        },
      ]}
    >
      {renderShape()}
    </Animated.View>
  );
});

// Bin component
const ShapeBin = ({ shape, onPress, isActive, justCaught, justMissed }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (justCaught) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [justCaught]);

  useEffect(() => {
    if (justMissed) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 50, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [justMissed]);

  const renderBinShape = () => {
    const opacity = 0.4;
    switch (shape.type) {
      case 'circle':
        return (
          <View style={[styles.binShapeCircle, { backgroundColor: shape.color, opacity }]} />
        );
      case 'square':
        return (
          <View style={[styles.binShapeSquare, { backgroundColor: shape.color, opacity }]} />
        );
      case 'triangle':
        return (
          <View style={[styles.binTriangle, { borderBottomColor: shape.color, opacity }]} />
        );
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.bin,
          isActive && styles.binActive,
          justCaught && styles.binSuccess,
          justMissed && styles.binError,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {renderBinShape()}
        <Text style={styles.binLabel}>{shape.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Conveyor belt component
const ConveyorBelt = () => {
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      scrollAnim.setValue(0);
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => animate());
    };
    animate();
  }, []);

  const translateX = scrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  return (
    <View style={styles.conveyorContainer}>
      <View style={styles.conveyorBelt}>
        <Animated.View style={[styles.conveyorPattern, { transform: [{ translateX }] }]}>
          {[...Array(20)].map((_, i) => (
            <View key={i} style={styles.conveyorStripe} />
          ))}
        </Animated.View>
      </View>
      <View style={styles.conveyorEdgeTop} />
      <View style={styles.conveyorEdgeBottom} />
      <View style={[styles.conveyorRoller, { left: 20 }]} />
      <View style={[styles.conveyorRoller, { right: 20 }]} />
    </View>
  );
};

// Create a shape for the conveyor
const createShape = (id) => {
  const shapeType = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    id,
    type: shapeType.type,
    color: shapeType.color,
    animatedX: new Animated.Value(-SHAPE_SIZE),
    animatedScale: new Animated.Value(1),
    animatedOpacity: new Animated.Value(1),
  };
};

export default function ShapeSorter({ navigation }) {
  const [shapes, setShapes] = useState([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activeBin, setActiveBin] = useState(null);
  const [caughtBin, setCaughtBin] = useState(null);
  const [missedBin, setMissedBin] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const shapeIdRef = useRef(0);
  const shapePositionsRef = useRef({});
  const celebrationScale = useRef(new Animated.Value(0)).current;

  // Track shape positions
  const handlePositionUpdate = useCallback((shapeId, x) => {
    shapePositionsRef.current[shapeId] = x;

    // Update active bin based on position
    const shapeCenter = x + SHAPE_SIZE / 2;
    let foundActive = null;
    BIN_POSITIONS.forEach((binX, index) => {
      if (Math.abs(shapeCenter - binX) < CATCH_ZONE_WIDTH) {
        foundActive = index;
      }
    });
    setActiveBin(foundActive);
  }, []);

  // Spawn shapes on conveyor
  useEffect(() => {
    const spawnShape = () => {
      const newShape = createShape(shapeIdRef.current++);
      setShapes((prev) => [...prev, newShape]);
    };

    setTimeout(spawnShape, 500);

    const interval = setInterval(spawnShape, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Handle shape falling off conveyor
  const handleMissed = useCallback((shape) => {
    delete shapePositionsRef.current[shape.id];
    setShapes((prev) => prev.filter((s) => s.id !== shape.id));
    setStreak(0);
  }, []);

  // Handle bin tap
  const handleBinPress = useCallback((binType, binIndex) => {
    const binX = BIN_POSITIONS[binIndex];

    setShapes((prev) => {
      for (let i = 0; i < prev.length; i++) {
        const shape = prev[i];
        const currentX = shapePositionsRef.current[shape.id] ?? -SHAPE_SIZE;
        const shapeCenter = currentX + SHAPE_SIZE / 2;
        const distance = Math.abs(shapeCenter - binX);

        if (distance < CATCH_ZONE_WIDTH) {
          if (shape.type === binType) {
            // Correct match!
            playPopSound();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Stop the movement and animate out
            shape.animatedX.stopAnimation();
            Animated.parallel([
              Animated.timing(shape.animatedScale, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(shape.animatedOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              delete shapePositionsRef.current[shape.id];
              setShapes((current) => current.filter((s) => s.id !== shape.id));
            });

            setScore((s) => s + 1);
            setStreak((s) => {
              const newStreak = s + 1;
              if (newStreak > 0 && newStreak % 5 === 0) {
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
                  Animated.delay(1000),
                  Animated.timing(celebrationScale, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                ]).start(() => setShowCelebration(false));
              }
              return newStreak;
            });
            setCaughtBin(binIndex);
            setTimeout(() => setCaughtBin(null), 200);
            break;
          } else {
            // Wrong bin!
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setStreak(0);
            setMissedBin(binIndex);
            setTimeout(() => setMissedBin(null), 200);
            break;
          }
        }
      }
      return prev;
    });
  }, []);

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
        <Text style={styles.scoreLabel}>sorted!</Text>
      </View>

      {/* Streak indicator */}
      {streak > 0 && (
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>Tap the matching bin!</Text>
      </View>

      {/* Conveyor belt */}
      <View style={styles.conveyorArea}>
        <ConveyorBelt />
        {shapes.map((shape) => (
          <ConveyorShape
            key={shape.id}
            shape={shape}
            onMissed={handleMissed}
            onPositionUpdate={handlePositionUpdate}
          />
        ))}
      </View>

      {/* Chute */}
      <View style={styles.chute} />

      {/* Bins */}
      <View style={styles.binsContainer}>
        {SHAPES.map((shape, index) => (
          <ShapeBin
            key={shape.type}
            shape={shape}
            onPress={() => handleBinPress(shape.type, index)}
            isActive={activeBin === index}
            justCaught={caughtBin === index}
            justMissed={missedBin === index}
          />
        ))}
      </View>

      {/* Factory floor */}
      <View style={styles.factoryFloor} />

      {/* Celebration */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebration,
            { transform: [{ scale: celebrationScale }] },
          ]}
        >
          <Text style={styles.celebrationEmoji}>⭐</Text>
          <Text style={styles.celebrationText}>{streak} in a row!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C3E50',
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
    shadowOpacity: 0.2,
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
    color: COLORS.white,
  },
  scoreLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  streakContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: 'rgba(255,150,0,0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 100,
  },
  streakText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFB800',
  },
  instructionContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  instructionText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  conveyorArea: {
    position: 'absolute',
    top: CONVEYOR_Y,
    left: 0,
    right: 0,
    height: SHAPE_SIZE + 60,
  },
  conveyorContainer: {
    position: 'absolute',
    top: SHAPE_SIZE + 10,
    left: 0,
    right: 0,
    height: 50,
  },
  conveyorBelt: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#34495E',
    overflow: 'hidden',
  },
  conveyorPattern: {
    flexDirection: 'row',
    position: 'absolute',
    left: -40,
    top: 0,
    bottom: 0,
  },
  conveyorStripe: {
    width: 20,
    height: '100%',
    backgroundColor: '#3D566E',
    marginRight: 20,
  },
  conveyorEdgeTop: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#5D6D7E',
    borderRadius: 4,
  },
  conveyorEdgeBottom: {
    position: 'absolute',
    top: 37,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#5D6D7E',
    borderRadius: 4,
  },
  conveyorRoller: {
    position: 'absolute',
    top: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7F8C8D',
    borderWidth: 4,
    borderColor: '#95A5A6',
  },
  conveyorShape: {
    position: 'absolute',
    top: 5,
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapeCircle: {
    width: SHAPE_SIZE - 10,
    height: SHAPE_SIZE - 10,
    borderRadius: (SHAPE_SIZE - 10) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  shapeSquare: {
    width: SHAPE_SIZE - 10,
    height: SHAPE_SIZE - 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  triangleWrapper: {
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapeTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: (SHAPE_SIZE - 10) / 2,
    borderRightWidth: (SHAPE_SIZE - 10) / 2,
    borderBottomWidth: SHAPE_SIZE - 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  shapeShine: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  chute: {
    position: 'absolute',
    top: CONVEYOR_Y + SHAPE_SIZE + 50,
    left: '20%',
    right: '20%',
    height: BIN_Y - CONVEYOR_Y - SHAPE_SIZE - 80,
    backgroundColor: '#3D566E',
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#5D6D7E',
  },
  binsContainer: {
    position: 'absolute',
    top: BIN_Y,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  bin: {
    width: BIN_SIZE,
    height: BIN_SIZE + 20,
    backgroundColor: '#465C6E',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#5D7A8C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  binActive: {
    borderColor: '#F1C40F',
    borderWidth: 4,
  },
  binSuccess: {
    backgroundColor: 'rgba(46, 204, 113, 0.3)',
    borderColor: '#2ECC71',
  },
  binError: {
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
    borderColor: '#E74C3C',
  },
  binShapeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  binShapeSquare: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  binTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 45,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  binLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  factoryFloor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#1A252F',
  },
  celebration: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  celebrationEmoji: {
    fontSize: 80,
  },
  celebrationText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F1C40F',
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
