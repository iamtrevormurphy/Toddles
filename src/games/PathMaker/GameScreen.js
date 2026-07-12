import React, { useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, SPACING, TYPE } from '../../constants/theme';
import BackButton from '../../components/BackButton';
import GradientBackground from '../../components/GradientBackground';
import PrimaryButton from '../../components/PrimaryButton';
import { executeProgram } from './executeProgram';
import Board, { tileCenter } from './Board';
import Character, { FACING_DEGREES } from './Character';

// Deliberate, unhurried pacing so a 4-year-old can map each tile to the
// character's action in real time — the single most important mechanic
// in the whole game.
const STEP_DURATION = 900;

function InstructionIcon({ type, size = 30, color = COLORS.white }) {
  const props = { stroke: color, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  if (type === 'step') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 20 L12 5 M6 11 L12 5 L18 11" {...props} />
      </Svg>
    );
  }
  if (type === 'turnRight') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 8 A7 7 0 1 1 5 17" {...props} />
        <Path d="M2 14 L5 18 L9 15" {...props} />
      </Svg>
    );
  }
  if (type === 'turnLeft') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M19 8 A7 7 0 1 0 19 17" {...props} />
        <Path d="M22 14 L19 18 L15 15" {...props} />
      </Svg>
    );
  }
  // hop
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={7} r={4} fill={color} />
      <Path d="M4 19 L20 19" {...props} />
    </Svg>
  );
}

export default function GameScreen({ level, navigation }) {
  const [phase, setPhase] = useState('editing'); // editing | running | success | bug
  const [activeIndex, setActiveIndex] = useState(null);

  const timersRef = useRef([]);
  const rotationTarget = useRef(FACING_DEGREES[level.start.facing]);

  const startCenter = tileCenter(level.start.x, level.start.y);
  const cx = useSharedValue(startCenter.x);
  const cy = useSharedValue(startCenter.y);
  const rotation = useSharedValue(rotationTarget.current);
  const lift = useSharedValue(0);

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const goToPose = (pose, duration = STEP_DURATION) => {
    const center = tileCenter(pose.x, pose.y);
    cx.value = withTiming(center.x, { duration });
    cy.value = withTiming(center.y, { duration });
    rotationTarget.current = FACING_DEGREES[pose.facing];
    rotation.value = withTiming(rotationTarget.current, { duration });
  };

  const animateStep = (step) => {
    if (step.type === 'turnLeft' || step.type === 'turnRight') {
      rotationTarget.current += step.type === 'turnRight' ? 90 : -90;
      rotation.value = withTiming(rotationTarget.current, { duration: STEP_DURATION });
      return;
    }

    if (step.result === 'ok') {
      const center = tileCenter(step.to.x, step.to.y);
      cx.value = withTiming(center.x, { duration: STEP_DURATION });
      cy.value = withTiming(center.y, { duration: STEP_DURATION });
      if (step.type === 'hop') {
        lift.value = withSequence(
          withTiming(-16, { duration: STEP_DURATION / 2 }),
          withTiming(0, { duration: STEP_DURATION / 2 })
        );
      }
      return;
    }

    // Failed step: lean toward the attempted cell, then retreat — the
    // "teeter at the edge and step back" bug feedback. Never a punishment
    // cue, just a gentle physical reaction.
    const from = tileCenter(step.from.x, step.from.y);
    const attempted = tileCenter(step.attempted.x, step.attempted.y);
    const leanX = from.x + (attempted.x - from.x) * 0.35;
    const leanY = from.y + (attempted.y - from.y) * 0.35;
    cx.value = withSequence(
      withTiming(leanX, { duration: STEP_DURATION * 0.4 }),
      withTiming(from.x, { duration: STEP_DURATION * 0.6 })
    );
    cy.value = withSequence(
      withTiming(leanY, { duration: STEP_DURATION * 0.4 }),
      withTiming(from.y, { duration: STEP_DURATION * 0.6 })
    );
  };

  const handlePlay = () => {
    if (phase === 'running') return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('running');
    setActiveIndex(null);

    const { steps, outcome, failIndex } = executeProgram(level.board, level.start, level.program);

    // Every Play press starts fresh from the level's start pose — snap
    // instantly (no tween) so replays don't glide from wherever the last
    // run ended, and so rotationTarget's running total can't compound
    // across runs (it must match the start facing exactly, not
    // accumulate additional turns from a previous play).
    const start = tileCenter(level.start.x, level.start.y);
    cx.value = start.x;
    cy.value = start.y;
    rotationTarget.current = FACING_DEGREES[level.start.facing];
    rotation.value = rotationTarget.current;
    lift.value = 0;

    steps.forEach((step, i) => {
      later(() => {
        setActiveIndex(step.instructionIndex);
        animateStep(step);
      }, i * STEP_DURATION);
    });

    later(() => {
      if (outcome === 'success') {
        setActiveIndex(null);
        setPhase('success');
        return;
      }

      // 'incomplete' has no tile to pulse yet (no track-slot UI in Phase
      // 1) — leave activeIndex on the last executed step instead.
      if (outcome !== 'incomplete') setActiveIndex(failIndex);
      setPhase('bug');

      later(() => {
        goToPose(level.start);
        later(() => {
          setPhase('editing');
          setActiveIndex(null);
        }, STEP_DURATION);
      }, 700);
    }, steps.length * STEP_DURATION + 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <GradientBackground name="dusk" />
      <BackButton onPress={() => navigation.goBack()} />

      <View style={styles.center}>
        <View style={styles.boardWrap}>
          <Board board={level.board} />
          <Character cx={cx} cy={cy} rotation={rotation} lift={lift} />
        </View>

        {phase === 'success' && <Text style={styles.feedback}>Goal reached!</Text>}

        <View style={styles.programRow}>
          {level.program.map((type, i) => (
            <View
              key={i}
              style={[
                styles.instructionTile,
                activeIndex === i && styles.instructionTileActive,
              ]}
            >
              <InstructionIcon type={type} color={activeIndex === i ? COLORS.white : COLORS.textDark} />
            </View>
          ))}
        </View>

        <PrimaryButton
          label={phase === 'running' ? 'Running…' : 'Play'}
          onPress={handlePlay}
          style={phase === 'running' && styles.buttonDisabled}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
  },
  boardWrap: {
    position: 'relative',
  },
  feedback: {
    ...TYPE.heading,
    color: COLORS.success,
  },
  programRow: {
    flexDirection: 'row',
    gap: SPACING[1],
  },
  instructionTile: {
    width: 56,
    height: 56,
    borderRadius: RADII.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  instructionTileActive: {
    backgroundColor: COLORS.bubbleOrange,
    transform: [{ scale: 1.08 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
