import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Text,
  SafeAreaView,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, TOUCH } from '../../constants/theme';
import { playPopSound, playCelebrationSound } from '../../utils/sound';

const { width, height } = Dimensions.get('window');

// Shape definitions
const SHAPES = [
  { type: 'circle', color: COLORS.bubblePink, emoji: '⭕' },
  { type: 'square', color: COLORS.bubbleBlue, emoji: '🟦' },
  { type: 'triangle', color: COLORS.bubbleYellow, emoji: '🔺' },
  { type: 'star', color: COLORS.bubblePurple, emoji: '⭐' },
];

const SHAPE_SIZE = 80;
const HOLE_SIZE = 100;

// Generate random shape pieces
const generatePieces = () => {
  const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
  return shuffled.map((shape, index) => ({
    ...shape,
    id: index,
    startX: 40 + (index % 2) * (width / 2 - 60),
    startY: height - 280 + Math.floor(index / 2) * 120,
  }));
};

// Generate hole positions
const generateHoles = () => {
  const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
  return shuffled.map((shape, index) => ({
    ...shape,
    id: index,
    x: 40 + (index % 2) * (width / 2 - 60),
    y: 140 + Math.floor(index / 2) * 130,
  }));
};

// Shape component (draggable)
const DraggableShape = ({ shape, onDrop, holes, disabled }) => {
  const pan = useRef(new Animated.ValueXY({ x: shape.startX, y: shape.startY })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [dragging, setDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        setDragging(true);
        Animated.spring(scale, {
          toValue: 1.2,
          useNativeDriver: true,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: Animated.event([null, { moveX: pan.x, moveY: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        setDragging(false);
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // Check if dropped on matching hole
        const matchingHole = holes.find((hole) => hole.type === shape.type);
        if (matchingHole) {
          const distance = Math.sqrt(
            Math.pow(gesture.moveX - (matchingHole.x + HOLE_SIZE / 2), 2) +
            Math.pow(gesture.moveY - (matchingHole.y + HOLE_SIZE / 2), 2)
          );

          if (distance < HOLE_SIZE) {
            // Snap to hole
            Animated.spring(pan, {
              toValue: { x: matchingHole.x + 10, y: matchingHole.y + 10 },
              useNativeDriver: false,
            }).start();
            onDrop(shape);
            return;
          }
        }

        // Return to start position
        Animated.spring(pan, {
          toValue: { x: shape.startX, y: shape.startY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const renderShape = () => {
    const shapeStyle = {
      width: SHAPE_SIZE,
      height: SHAPE_SIZE,
      backgroundColor: shape.color,
      justifyContent: 'center',
      alignItems: 'center',
    };

    switch (shape.type) {
      case 'circle':
        return <View style={[shapeStyle, { borderRadius: SHAPE_SIZE / 2 }]} />;
      case 'square':
        return <View style={[shapeStyle, { borderRadius: 8 }]} />;
      case 'triangle':
        return (
          <View style={styles.triangleContainer}>
            <View style={[styles.triangle, { borderBottomColor: shape.color }]} />
          </View>
        );
      case 'star':
        return (
          <View style={[shapeStyle, { borderRadius: 8, backgroundColor: 'transparent' }]}>
            <Text style={{ fontSize: 60 }}>⭐</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableShape,
        {
          left: pan.x,
          top: pan.y,
          transform: [{ scale }],
          zIndex: dragging ? 100 : 1,
        },
      ]}
    >
      {renderShape()}
    </Animated.View>
  );
};

// Hole component
const ShapeHole = ({ hole, filled }) => {
  const renderHoleShape = () => {
    const holeStyle = {
      width: HOLE_SIZE - 20,
      height: HOLE_SIZE - 20,
      borderWidth: 4,
      borderStyle: 'dashed',
      borderColor: filled ? COLORS.success : hole.color,
      backgroundColor: filled ? `${COLORS.success}30` : 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    };

    switch (hole.type) {
      case 'circle':
        return <View style={[holeStyle, { borderRadius: (HOLE_SIZE - 20) / 2 }]} />;
      case 'square':
        return <View style={[holeStyle, { borderRadius: 8 }]} />;
      case 'triangle':
        return (
          <View style={styles.triangleHoleContainer}>
            <View style={[styles.triangleHole, { borderBottomColor: filled ? COLORS.success : hole.color }]} />
          </View>
        );
      case 'star':
        return (
          <View style={[holeStyle, { borderRadius: 8, borderColor: 'transparent' }]}>
            <Text style={{ fontSize: 50, opacity: filled ? 1 : 0.3 }}>⭐</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.hole, { left: hole.x, top: hole.y }]}>
      {renderHoleShape()}
    </View>
  );
};

export default function ShapeSorter({ navigation }) {
  const [pieces, setPieces] = useState([]);
  const [holes, setHoles] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationScale = useRef(new Animated.Value(0)).current;

  // Initialize game
  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    setPieces(generatePieces());
    setHoles(generateHoles());
    setMatched([]);
  };

  const handleDrop = (shape) => {
    playPopSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setMatched((prev) => [...prev, shape.type]);
    setScore((prev) => prev + 1);

    // Check if all matched
    if (matched.length + 1 === SHAPES.length) {
      // All shapes matched - celebrate!
      setShowCelebration(true);
      playCelebrationSound();

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
        // Start new round after brief delay
        setTimeout(resetGame, 500);
      });
    }
  };

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
        <Text style={styles.scoreLabel}>matched!</Text>
      </View>

      {/* Holes */}
      {holes.map((hole) => (
        <ShapeHole
          key={`hole-${hole.id}`}
          hole={hole}
          filled={matched.includes(hole.type)}
        />
      ))}

      {/* Draggable pieces */}
      {pieces.map((piece) => (
        !matched.includes(piece.type) && (
          <DraggableShape
            key={`piece-${piece.id}`}
            shape={piece}
            holes={holes}
            onDrop={handleDrop}
            disabled={matched.includes(piece.type)}
          />
        )
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
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
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
  hole: {
    position: 'absolute',
    width: HOLE_SIZE,
    height: HOLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draggableShape: {
    position: 'absolute',
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triangleContainer: {
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: SHAPE_SIZE / 2,
    borderRightWidth: SHAPE_SIZE / 2,
    borderBottomWidth: SHAPE_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  triangleHoleContainer: {
    width: HOLE_SIZE - 20,
    height: HOLE_SIZE - 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triangleHole: {
    width: 0,
    height: 0,
    borderLeftWidth: (HOLE_SIZE - 20) / 2,
    borderRightWidth: (HOLE_SIZE - 20) / 2,
    borderBottomWidth: HOLE_SIZE - 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'dashed',
  },
  celebration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 200,
  },
  celebrationEmoji: {
    fontSize: 100,
  },
  celebrationText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 20,
  },
});
