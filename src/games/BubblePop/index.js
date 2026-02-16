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
import { COLORS, BUBBLE_COLORS, TOUCH, TIMING, GAME } from '../../constants/theme';
import { playPopSound, playCelebrationSound, initAudio } from '../../utils/sound';

const { width, height } = Dimensions.get('window');

// Color names for display
const COLOR_NAMES = {
  [COLORS.bubblePink]: { name: 'Pink', emoji: '🩷' },
  [COLORS.bubbleBlue]: { name: 'Blue', emoji: '💙' },
  [COLORS.bubbleYellow]: { name: 'Yellow', emoji: '💛' },
  [COLORS.bubbleGreen]: { name: 'Green', emoji: '💚' },
  [COLORS.bubblePurple]: { name: 'Purple', emoji: '💜' },
  [COLORS.bubbleOrange]: { name: 'Orange', emoji: '🧡' },
};

// Generate a random bubble
const createBubble = (id) => {
  const size = Math.random() * (TOUCH.bubbleMaxSize - TOUCH.bubbleMinSize) + TOUCH.bubbleMinSize;
  return {
    id,
    x: Math.random() * (width - size),
    y: height + size,
    size,
    color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
    animatedY: new Animated.Value(height + size),
    animatedScale: new Animated.Value(1),
    animatedOpacity: new Animated.Value(1),
    wobbleAnim: new Animated.Value(0),
  };
};

// Individual bubble component
const Bubble = React.memo(({ bubble, onPop }) => {
  const handlePress = () => {
    onPop(bubble.id, bubble.color);
  };

  useEffect(() => {
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(bubble.wobbleAnim, {
          toValue: 1,
          duration: 1000 + Math.random() * 500,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.wobbleAnim, {
          toValue: 0,
          duration: 1000 + Math.random() * 500,
          useNativeDriver: true,
        }),
      ])
    );
    wobble.start();
    return () => wobble.stop();
  }, []);

  const wobbleX = bubble.wobbleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        {
          left: bubble.x,
          width: bubble.size,
          height: bubble.size,
          transform: [
            { translateY: bubble.animatedY },
            { translateX: wobbleX },
            { scale: bubble.animatedScale },
          ],
          opacity: bubble.animatedOpacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bubble,
          {
            width: bubble.size,
            height: bubble.size,
            backgroundColor: bubble.color,
            borderRadius: bubble.size / 2,
          },
        ]}
        onPressIn={handlePress}
        activeOpacity={0.8}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <View
          style={[
            styles.bubbleShine,
            {
              width: bubble.size * 0.3,
              height: bubble.size * 0.3,
              borderRadius: bubble.size * 0.15,
              top: bubble.size * 0.15,
              left: bubble.size * 0.15,
            },
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

// Color counter display
const ColorCounter = React.memo(({ colorCounts }) => {
  const sortedColors = React.useMemo(() => {
    return Object.entries(colorCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [colorCounts]);

  if (sortedColors.length === 0) return null;

  return (
    <View style={styles.colorCounter}>
      {sortedColors.map(([color, count]) => (
        <View key={color} style={styles.colorRow}>
          <View style={[styles.colorDot, { backgroundColor: color }]} />
          <Text style={styles.colorCount}>{count}</Text>
        </View>
      ))}
    </View>
  );
});

// Celebration component
const Celebration = ({ visible, count }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, count]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.celebration,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={styles.celebrationEmoji}>🎉</Text>
      <Text style={styles.celebrationText}>{count}!</Text>
    </Animated.View>
  );
};

export default function BubblePop({ navigation }) {
  const [bubbles, setBubbles] = useState([]);
  const [popCount, setPopCount] = useState(0);
  const [colorCounts, setColorCounts] = useState({});
  const [showCelebration, setShowCelebration] = useState(false);
  const bubbleIdRef = useRef(0);
  const bubblesRef = useRef([]);

  // Sync bubbles state with ref for the interval to check
  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  // Initial audio
  useEffect(() => {
    initAudio();
  }, []);

  // Spawn bubbles periodically
  useEffect(() => {
    const spawnBubble = () => {
      // Use ref to check current length
      if (bubblesRef.current.length < GAME.maxBubbles) {
        const newBubble = createBubble(bubbleIdRef.current++);
        setBubbles((prev) => [...prev, newBubble]);

        Animated.timing(newBubble.animatedY, {
          toValue: -TOUCH.bubbleMaxSize,
          duration: TIMING.bubbleRiseDuration,
          useNativeDriver: true,
        }).start(() => {
          setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
        });
      }
    };

    // Initial spawn
    for (let i = 0; i < 5; i++) {
      setTimeout(() => spawnBubble(), i * 300);
    }

    const interval = setInterval(spawnBubble, TIMING.spawnInterval);
    return () => clearInterval(interval);
  }, []);

  // Handle bubble pop
  const handlePop = useCallback((bubbleId, bubbleColor) => {
    setBubbles((prev) => {
      const bubble = prev.find((b) => b.id === bubbleId);
      if (!bubble) return prev;

      // Pop animation
      Animated.parallel([
        Animated.timing(bubble.animatedScale, {
          toValue: 1.5,
          duration: TIMING.popDuration,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.animatedOpacity, {
          toValue: 0,
          duration: TIMING.popDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setBubbles((current) => current.filter((b) => b.id !== bubbleId));
      });

      return prev;
    });

    // Play pop sound
    playPopSound();

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update color count
    setColorCounts((prev) => ({
      ...prev,
      [bubbleColor]: (prev[bubbleColor] || 0) + 1,
    }));

    // Update total count
    setPopCount((prev) => {
      const newCount = prev + 1;
      if (newCount % GAME.celebrationThreshold === 0) {
        setShowCelebration(true);
        playCelebrationSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowCelebration(false), TIMING.celebrationDuration);
      }
      return newCount;
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

      {/* Pop counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>{popCount}</Text>
        <Text style={styles.counterLabel}>pops!</Text>
      </View>

      {/* Color breakdown */}
      <ColorCounter colorCounts={colorCounts} />

      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <Bubble key={bubble.id} bubble={bubble} onPop={handlePop} />
      ))}

      {/* Celebration overlay */}
      <Celebration visible={showCelebration} count={popCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSky,
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
  counter: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  counterText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  counterLabel: {
    fontSize: 18,
    color: COLORS.textLight,
  },
  colorCounter: {
    position: 'absolute',
    top: 130,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
  },
  colorCount: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    minWidth: 30,
  },
  bubbleContainer: {
    position: 'absolute',
  },
  bubble: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  bubbleShine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  celebration: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  celebrationEmoji: {
    fontSize: 80,
  },
  celebrationText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.celebration,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
