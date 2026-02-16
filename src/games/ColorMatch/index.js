import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const { width } = Dimensions.get('window');

// Color definitions with matching emojis
const GAME_COLORS = [
  { name: 'Red', color: '#FF6B6B', emojis: ['🍎', '🍒', '❤️', '🌹', '🍓', '🦀'] },
  { name: 'Blue', color: '#4ECDC4', emojis: ['🐳', '💎', '🧊', '🫧', '🐬', '💧'] },
  { name: 'Yellow', color: '#FFE66D', emojis: ['🌟', '🍋', '🌻', '⭐', '🍌', '🌼'] },
  { name: 'Green', color: '#7ED957', emojis: ['🐸', '🥒', '🍀', '🌿', '🥦', '🌲'] },
  { name: 'Purple', color: '#A28BFE', emojis: ['🍇', '🔮', '🦄', '👾', '🍆', '💜'] },
  { name: 'Orange', color: '#FF9F43', emojis: ['🍊', '🥕', '🏀', '🦊', '🧡', '🎃'] },
];

const GRID_SIZE = 3;
const ITEM_SIZE = (width - 80) / GRID_SIZE;

// Generate a round with target color and grid items
const generateRound = () => {
  const targetColor = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)];
  const matchCount = 2 + Math.floor(Math.random() * 2); // 2-3 matches
  const items = [];

  // Add matching items with color-matched emojis
  const usedEmojis = new Set();
  for (let i = 0; i < matchCount; i++) {
    let emoji;
    do {
      emoji = targetColor.emojis[Math.floor(Math.random() * targetColor.emojis.length)];
    } while (usedEmojis.has(emoji) && usedEmojis.size < targetColor.emojis.length);
    usedEmojis.add(emoji);

    items.push({
      id: i,
      color: targetColor,
      emoji: emoji,
      isTarget: true,
    });
  }

  // Fill rest with non-matching colors (with their matching emojis)
  const otherColors = GAME_COLORS.filter(c => c.name !== targetColor.name);
  for (let i = matchCount; i < GRID_SIZE * GRID_SIZE; i++) {
    const randomColor = otherColors[Math.floor(Math.random() * otherColors.length)];
    const emoji = randomColor.emojis[Math.floor(Math.random() * randomColor.emojis.length)];
    items.push({
      id: i,
      color: randomColor,
      emoji: emoji,
      isTarget: false,
    });
  }

  // Shuffle items and reassign IDs
  return {
    targetColor,
    items: items.sort(() => Math.random() - 0.5).map((item, index) => ({
      ...item,
      id: index,
    })),
    matchCount,
  };
};

// Grid item component
const GridItem = ({ item, onPress, disabled, found, roundKey }) => {
  // Reset animations when round changes
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Reset opacity when round changes
  useEffect(() => {
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);
  }, [roundKey]);

  useEffect(() => {
    if (found) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [found]);

  const handlePress = () => {
    if (!disabled && !found) {
      onPress(item);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || found}
    >
      <Animated.View
        style={[
          styles.gridItem,
          {
            backgroundColor: item.color.color,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.itemEmoji}>{item.emoji}</Text>
        {found && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Target color indicator
const TargetIndicator = ({ color, found, total }) => {
  return (
    <View style={styles.targetContainer}>
      <Text style={styles.targetLabel}>Find the</Text>
      <View style={[styles.targetColorBox, { backgroundColor: color.color }]}>
        <Text style={styles.targetColorName}>{color.name}</Text>
      </View>
      <View style={styles.progressDots}>
        {[...Array(total)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i < found ? color.color : '#DDD' }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export default function ColorMatch({ navigation }) {
  const [round, setRound] = useState(null);
  const [roundKey, setRoundKey] = useState(0);
  const [foundItems, setFoundItems] = useState([]);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [wrongItem, setWrongItem] = useState(null);
  const celebrationScale = useRef(new Animated.Value(0)).current;

  // Initialize game
  useEffect(() => {
    startNewRound();
  }, []);

  const startNewRound = () => {
    setRound(generateRound());
    setFoundItems([]);
    setRoundKey(k => k + 1); // Force re-render with fresh animations
  };

  const handleItemPress = useCallback((item) => {
    if (item.isTarget) {
      // Correct!
      playPopSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const newFound = [...foundItems, item.id];
      setFoundItems(newFound);
      setScore(prev => prev + 1);

      // Check if round complete
      if (newFound.length === round.matchCount) {
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
          setTimeout(startNewRound, 300);
        });
      }
    } else {
      // Wrong - gentle feedback on that specific item
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setWrongItem(item.id);
      setTimeout(() => setWrongItem(null), 400);
    }
  }, [foundItems, round]);

  if (!round) return null;

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
        <Text style={styles.scoreLabel}>found!</Text>
      </View>

      {/* Target indicator */}
      <TargetIndicator
        color={round.targetColor}
        found={foundItems.length}
        total={round.matchCount}
      />

      {/* Grid */}
      <View style={styles.grid}>
        {round.items.map((item) => (
          <View key={item.id} style={wrongItem === item.id && styles.wrongShake}>
            <GridItem
              item={item}
              onPress={handleItemPress}
              disabled={showCelebration}
              found={foundItems.includes(item.id)}
              roundKey={roundKey}
            />
          </View>
        ))}
      </View>

      {/* Celebration */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebration,
            { transform: [{ scale: celebrationScale }] },
          ]}
        >
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationText}>Great!</Text>
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
  targetContainer: {
    alignItems: 'center',
    marginTop: 120,
    marginBottom: 30,
  },
  targetLabel: {
    fontSize: 28,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  targetColorBox: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  targetColorName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressDots: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  progressDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 15,
  },
  wrongShake: {
    transform: [{ translateX: -3 }],
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  itemEmoji: {
    fontSize: 48,
  },
  checkmark: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: 'bold',
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
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 10,
  },
});
