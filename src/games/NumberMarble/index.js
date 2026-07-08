import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { ANIMATION, COLORS, MARBLE_COLORS, RADII, SHADOWS, TYPE } from '../../constants/theme';
import {
  playSplitSound,
  playCombineSound,
  playCelebrationSound,
  playOverflowSound,
} from '../../utils/sound';
import { successHaptic, tapHaptic, heavyHaptic } from '../../utils/haptics';
import { distance } from '../../utils/collision';
import BackButton from '../../components/BackButton';
import Confetti from '../../components/Confetti';
import GradientBackground from '../../components/GradientBackground';
import PrimaryButton from '../../components/PrimaryButton';
import { ChevronRightIcon, RefreshIcon } from '../../components/icons';
import Character from './Character';
import Marble, { MARBLE_SIZE } from './Marble';
import MarbleArea, { PLAY_AREA, getMarblePositions, getSplitPositions, resolveOverlaps } from './MarbleArea';
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
  const [slotWobbleKey, setSlotWobbleKey] = useState(0);
  const marbleIdRef = useRef(0);
  const characterRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(
    () => () => timersRef.current.forEach(clearTimeout),
    []
  );

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const clampToPlayArea = (pos) => ({
    x: Math.min(Math.max(pos.x, PLAY_AREA.x + 40), PLAY_AREA.x + PLAY_AREA.width - 40),
    y: Math.min(Math.max(pos.y, PLAY_AREA.y + 40), PLAY_AREA.y + PLAY_AREA.height - 40),
  });

  // Juno watches the dragged marble through these shared values (written in
  // Marble.js's pan worklet — zero React renders per frame).
  const gaze = {
    x: useSharedValue(0),
    y: useSharedValue(0),
    active: useSharedValue(0),
  };
  const characterAnchor = { x: width / 2, y: 148 };

  // Initialize level
  useEffect(() => {
    initializeLevel(currentLevel);
  }, [currentLevel]);

  // Initialize marbles for a level
  const initializeLevel = (level) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const positions = getMarblePositions(level.marbles.length);
    const newMarbles = level.marbles.map((value, index) => ({
      id: marbleIdRef.current++,
      value,
      x: positions[index].x,
      y: positions[index].y,
    }));
    setMarbles(resolveOverlaps(newMarbles));
    setIsDancing(false);
    setIsLevelComplete(false);
    setShowConfetti(false);
  };

  // Split marble into two: children mount AT the parent (fromX/fromY) and
  // roll apart to their split positions with opposite spins; neighbors get
  // bumped aside by resolveOverlaps.
  const handleMarbleTap = useCallback((marbleId) => {
    setMarbles((prev) => {
      const marble = prev.find((m) => m.id === marbleId);
      if (!marble || marble.value <= 1 || marble.merging || marble.inSlot) return prev;

      const half1 = Math.floor(marble.value / 2);
      const half2 = Math.ceil(marble.value / 2);
      const positions = getSplitPositions(marble.x, marble.y);

      const newMarbles = [
        {
          id: marbleIdRef.current++,
          value: half1,
          x: positions[0].x,
          y: positions[0].y,
          fromX: marble.x,
          fromY: marble.y,
        },
        {
          id: marbleIdRef.current++,
          value: half2,
          x: positions[1].x,
          y: positions[1].y,
          fromX: marble.x,
          fromY: marble.y,
        },
      ];

      playSplitSound();

      return resolveOverlaps([...prev.filter((m) => m.id !== marbleId), ...newMarbles]);
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

  // Two-phase merge: both marbles roll to the meeting point (phase 1), then
  // become one after ANIMATION.combineDuration (phase 2 — sounds/Juno land
  // when they visually meet). The resident keeps its id so nothing pops.
  const startMerge = (dragged, resident, position, callback, { intoSlot = false } = {}) => {
    const midX = intoSlot ? resident.x : (position.x + resident.x) / 2;
    const midY = intoSlot ? resident.y : (position.y + resident.y) / 2;
    callback({ x: midX, y: midY });
    setMarbles((prev) =>
      prev.map((m) =>
        m.id === resident.id || m.id === dragged.id
          ? { ...m, x: midX, y: midY, merging: true, ...(m.id === dragged.id && dragged.inSlot ? { inSlot: false } : {}) }
          : m
      )
    );
    later(() => {
      playCombineSound();
      heavyHaptic();
      characterRef.current?.react('nod');
      setMarbles((prev) =>
        resolveOverlaps(
          prev
            .filter((m) => m.id !== dragged.id)
            .map((m) =>
              m.id === resident.id
                ? { ...m, value: resident.value + dragged.value, merging: false }
                : m
            ),
          PLAY_AREA,
          { pinnedId: resident.id }
        )
      );
    }, ANIMATION.combineDuration);
  };

  // Win/accumulate/overflow once a marble settles into the socket
  const settleIntoSlot = (marbleId, newSum, residentId) => {
    const absorb = (prev) =>
      prev
        .filter((m) => m.id !== residentId)
        .map((m) =>
          m.id === marbleId
            ? { ...m, inSlot: true, merging: false, x: TARGET_SLOT.x, y: TARGET_SLOT.y, value: newSum }
            : m
        );

    if (newSum === currentLevel.target) {
      setMarbles(absorb);
      setIsDancing(true);
      setIsLevelComplete(true);
      setShowConfetti(true);
      playCelebrationSound();
      successHaptic();
      later(() => setMarbles((prev) => prev.filter((m) => !m.inSlot)), 500);
      return;
    }

    if (newSum > currentLevel.target) {
      // Overflow — never an error: the sum shows for a beat, the socket
      // wobbles, then the whole accumulated marble rolls back out (sum
      // conserved, the child can re-split it).
      setMarbles(absorb);
      if (residentId != null) {
        playCombineSound();
        heavyHaptic();
      }
      setSlotWobbleKey((k) => k + 1);
      later(() => {
        playOverflowSound();
        tapHaptic();
        characterRef.current?.react('ohno');
        const eject = clampToPlayArea({
          x: TARGET_SLOT.x,
          y: PLAY_AREA.y + PLAY_AREA.height - 60,
        });
        setMarbles((prev) =>
          resolveOverlaps(
            prev.map((m) =>
              m.id === marbleId ? { ...m, inSlot: false, x: eject.x, y: eject.y } : m
            ),
            PLAY_AREA,
            { pinnedId: marbleId }
          )
        );
      }, 550);
      return;
    }

    // Accumulate: the slot marble grows toward the ring
    setMarbles(absorb);
    playCombineSound();
    heavyHaptic();
    characterRef.current?.react('nod');
  };

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

      const slotMarble = marbles.find((m) => m.inSlot && m.id !== marbleId);
      const distToTarget = distance(position, { x: TARGET_SLOT.x, y: TARGET_SLOT.y });

      // --- Dropped on the target slot: accumulate toward the target ---
      if (distToTarget < SLOT_SIZE) {
        if (draggedMarble.inSlot) {
          // The slot marble itself — settle back into the socket
          callback({ x: TARGET_SLOT.x, y: TARGET_SLOT.y });
          return;
        }
        const newSum = (slotMarble?.value ?? 0) + draggedMarble.value;
        callback({ x: TARGET_SLOT.x, y: TARGET_SLOT.y });
        setMarbles((prev) =>
          prev.map((m) => (m.id === marbleId ? { ...m, merging: true } : m))
        );
        later(() => settleIntoSlot(marbleId, newSum, slotMarble?.id ?? null), ANIMATION.combineDuration);
        return;
      }

      // --- Dropped on another board marble: two-phase combine ---
      const otherMarble = marbles.find(
        (m) =>
          m.id !== marbleId &&
          !m.inSlot &&
          !m.merging &&
          distance(position, { x: m.x, y: m.y }) < COMBINE_THRESHOLD
      );
      if (otherMarble) {
        startMerge(draggedMarble, otherMarble, position, callback);
        return;
      }

      // --- Slot marble dragged out to open board: retrieval ---
      if (draggedMarble.inSlot) {
        const dropPos = clampToPlayArea(position);
        callback(dropPos);
        setMarbles((prev) =>
          resolveOverlaps(
            prev.map((m) =>
              m.id === marbleId ? { ...m, inSlot: false, x: dropPos.x, y: dropPos.y } : m
            ),
            PLAY_AREA,
            { pinnedId: marbleId }
          )
        );
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
      <GradientBackground name="mist" />
      <BackButton onPress={() => navigation.goBack()} />

      {/* Level indicator */}
      <View style={styles.levelIndicator}>
        <Text style={styles.levelText}>
          Level {currentLevel.id}/{getTotalLevels()}
        </Text>
      </View>

      {/* Juno with target number */}
      <View style={styles.characterArea}>
        <Character
          ref={characterRef}
          targetNumber={currentLevel.target}
          isDancing={isDancing}
          gazeTarget={gaze}
          anchor={characterAnchor}
        />
      </View>

      {/* Play area background */}
      <MarbleArea />

      {/* Target slot (rendered under the marbles so the slot marble sits in it) */}
      <TargetSlot
        x={TARGET_SLOT.x}
        y={TARGET_SLOT.y}
        isHighlighted={isTargetHighlighted}
        hasMarble={marbles.some((m) => m.inSlot)}
        wobbleKey={slotWobbleKey}
      />

      {/* Marbles */}
      {marbles.map((marble) => (
        <Marble
          key={marble.id}
          id={marble.id}
          value={marble.value}
          x={marble.x}
          y={marble.y}
          fromX={marble.fromX}
          fromY={marble.fromY}
          restScale={
            marble.inSlot
              ? 0.62 + 0.38 * Math.min(1, marble.value / currentLevel.target)
              : 1
          }
          onTap={handleMarbleTap}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          isActive={draggedMarbleId !== null && draggedMarbleId !== marble.id}
          gazeSV={gaze}
        />
      ))}

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
            <Text style={styles.completeText}>
              {currentLevel.target}!
            </Text>
            <PrimaryButton
              label="Next"
              icon={<ChevronRightIcon size={26} />}
              onPress={handleNextLevel}
            />
          </View>
        </View>
      )}

      {/* Retry button (when stuck) */}
      {!isLevelComplete && marbles.length > 0 && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <RefreshIcon size={28} color={COLORS.textLight} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  levelIndicator: {
    position: 'absolute',
    top: 55,
    right: 20,
    zIndex: 100,
  },
  levelText: {
    ...TYPE.body,
    fontSize: 18,
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
    ...TYPE.body,
    fontSize: 18,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  completeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(62, 58, 94, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  completeCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.xl,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 20,
    ...SHADOWS.floating,
  },
  completeText: {
    ...TYPE.display,
    fontSize: 46,
    color: MARBLE_COLORS.marble,
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
    ...SHADOWS.card,
  },
});
