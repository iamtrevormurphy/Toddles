import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { COLORS, MARBLE_COLORS, ANIMATION } from '../../constants/theme';
import {
  playSplitSound,
  playCombineSound,
  playCelebrationSound,
  playErrorSound,
} from '../../utils/sound';
import { successHaptic, errorHaptic, heavyHaptic } from '../../utils/haptics';
import { distance } from '../../utils/collision';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import Character from './Character';
import Marble, { MARBLE_SIZE } from './Marble';
import MarbleArea, { PLAY_AREA, getMarblePositions, getSplitPositions } from './MarbleArea';
import TargetSlot, { getSlotBounds, SLOT_SIZE } from './TargetSlot';
import { LEVELS, getNextLevel, getTotalLevels } from './levels';

const { width, height } = Dimensions.get('window');

// Target slot position (below character)
const TARGET_SLOT = {
  x: width / 2,
  y: height * 0.78,
};

// Combine threshold - how close marbles need to be to combine
const COMBINE_THRESHOLD = MARBLE_SIZE * 1.2;

export default function NumberMarble({ navigation }) {
  const [currentLevel, setCurrentLevel] = useState(LEVELS[0]);
  const [marbles, setMarbles] = useState([]);
  const [isDancing, setIsDancing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isTargetHighlighted, setIsTargetHighlighted] = useState(false);
  const [draggedMarbleId, setDraggedMarbleId] = useState(null);
  const marbleIdRef = useRef(0);

  // Initialize level
  useEffect(() => {
    initializeLevel(currentLevel);
  }, [currentLevel]);

  // Initialize marbles for a level
  const initializeLevel = (level) => {
    const positions = getMarblePositions(level.marbles.length);
    const newMarbles = level.marbles.map((value, index) => ({
      id: marbleIdRef.current++,
      value,
      x: positions[index].x,
      y: positions[index].y,
    }));
    setMarbles(newMarbles);
    setIsDancing(false);
    setIsLevelComplete(false);
    setShowConfetti(false);
  };

  // Split marble into two
  const handleMarbleTap = useCallback((marbleId) => {
    setMarbles((prev) => {
      const marble = prev.find((m) => m.id === marbleId);
      if (!marble || marble.value <= 1) return prev;

      // Split the value
      const half1 = Math.floor(marble.value / 2);
      const half2 = Math.ceil(marble.value / 2);

      // Get split positions
      const positions = getSplitPositions(marble.x, marble.y);

      // Create two new marbles
      const newMarbles = [
        {
          id: marbleIdRef.current++,
          value: half1,
          x: positions[0].x,
          y: positions[0].y,
        },
        {
          id: marbleIdRef.current++,
          value: half2,
          x: positions[1].x,
          y: positions[1].y,
        },
      ];

      playSplitSound();

      // Remove old marble and add new ones
      return [...prev.filter((m) => m.id !== marbleId), ...newMarbles];
    });
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((marbleId) => {
    setDraggedMarbleId(marbleId);
  }, []);

  // Handle drag move - check for target slot highlight
  const handleDragMove = useCallback((marbleId, position) => {
    const slotBounds = getSlotBounds(TARGET_SLOT.x, TARGET_SLOT.y);
    const dist = distance(position, { x: TARGET_SLOT.x, y: TARGET_SLOT.y });
    setIsTargetHighlighted(dist < SLOT_SIZE);
  }, []);

  // Handle marble drag end
  const handleDragEnd = useCallback(
    (marbleId, position, callback) => {
      setDraggedMarbleId(null);
      setIsTargetHighlighted(false);

      const draggedMarble = marbles.find((m) => m.id === marbleId);
      if (!draggedMarble) {
        callback(null);
        return;
      }

      // Check if dropped on target slot
      const distToTarget = distance(position, { x: TARGET_SLOT.x, y: TARGET_SLOT.y });
      if (distToTarget < SLOT_SIZE) {
        // Check if correct answer
        if (draggedMarble.value === currentLevel.target) {
          // Correct!
          setIsDancing(true);
          setIsLevelComplete(true);
          setShowConfetti(true);
          playCelebrationSound();
          successHaptic();
          callback({ x: TARGET_SLOT.x, y: TARGET_SLOT.y });

          // Remove marble after animation
          setTimeout(() => {
            setMarbles((prev) => prev.filter((m) => m.id !== marbleId));
          }, 500);
          return;
        } else {
          // Wrong answer
          playErrorSound();
          errorHaptic();
          callback(null);
          return;
        }
      }

      // Check if dropped on another marble (combine)
      const otherMarble = marbles.find(
        (m) => m.id !== marbleId && distance(position, { x: m.x, y: m.y }) < COMBINE_THRESHOLD
      );

      if (otherMarble) {
        // Combine marbles
        const combinedValue = draggedMarble.value + otherMarble.value;
        const combinedX = (position.x + otherMarble.x) / 2;
        const combinedY = (position.y + otherMarble.y) / 2;

        playCombineSound();
        heavyHaptic();

        // Remove both marbles and create combined one
        setMarbles((prev) => [
          ...prev.filter((m) => m.id !== marbleId && m.id !== otherMarble.id),
          {
            id: marbleIdRef.current++,
            value: combinedValue,
            x: combinedX,
            y: combinedY,
          },
        ]);

        callback({ x: combinedX, y: combinedY });
        return;
      }

      // No valid drop - return to original position
      callback(null);
    },
    [marbles, currentLevel.target]
  );

  // Handle confetti completion
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  // Go to next level
  const handleNextLevel = useCallback(() => {
    const next = getNextLevel(currentLevel.id);
    setCurrentLevel(next);
  }, [currentLevel]);

  // Reset current level
  const handleRetry = useCallback(() => {
    initializeLevel(currentLevel);
  }, [currentLevel]);

  return (
    <SafeAreaView style={styles.container}>
      <BackButton onPress={() => navigation.goBack()} />

      {/* Level indicator */}
      <View style={styles.levelIndicator}>
        <Text style={styles.levelText}>
          Level {currentLevel.id}/{getTotalLevels()}
        </Text>
      </View>

      {/* Character with target number */}
      <View style={styles.characterArea}>
        <Character
          targetNumber={currentLevel.target}
          isDancing={isDancing}
        />
      </View>

      {/* Play area background */}
      <MarbleArea />

      {/* Marbles */}
      {marbles.map((marble) => (
        <Marble
          key={marble.id}
          id={marble.id}
          value={marble.value}
          x={marble.x}
          y={marble.y}
          onTap={handleMarbleTap}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          isActive={draggedMarbleId !== null && draggedMarbleId !== marble.id}
        />
      ))}

      {/* Target slot */}
      <TargetSlot
        x={TARGET_SLOT.x}
        y={TARGET_SLOT.y}
        isHighlighted={isTargetHighlighted}
      />

      {/* Hint text */}
      {!isLevelComplete && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{currentLevel.hint}</Text>
        </View>
      )}

      {/* Confetti */}
      <Confetti
        visible={showConfetti}
        originX={TARGET_SLOT.x}
        originY={TARGET_SLOT.y}
        onComplete={handleConfettiComplete}
      />

      {/* Level complete overlay */}
      {isLevelComplete && (
        <View style={styles.completeOverlay}>
          <View style={styles.completeCard}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={styles.completeText}>
              {currentLevel.target}!
            </Text>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextLevel}
            >
              <Text style={styles.nextButtonText}>Next Level →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Retry button (when stuck) */}
      {!isLevelComplete && marbles.length > 0 && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>↺</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  levelIndicator: {
    position: 'absolute',
    top: 55,
    right: 20,
    zIndex: 100,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  characterArea: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 18,
    color: COLORS.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  completeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  completeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  completeEmoji: {
    fontSize: 64,
  },
  completeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: MARBLE_COLORS.marble,
    marginTop: 8,
  },
  nextButton: {
    marginTop: 24,
    backgroundColor: MARBLE_COLORS.marble,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  retryButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 24,
    color: COLORS.textLight,
  },
});
