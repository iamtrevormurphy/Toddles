import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Companion, CHARACTERS } from '../../characters';

// Grid facing → rig view, unchanged from PathMaker even though this game
// projects to a dimetric screen: the iso projection only changes where
// cx/cy LAND (grid E travels screen-SE, S travels screen-SW, and so on);
// the body art still shows profile-East for E, mirrored profile for W,
// back for N, front for S. Profile/front/back figures on diagonal
// causeways is exactly how Monument Valley reads, so the rig needs zero
// new views. The body never rotates as a transform.
export const VIEW_FOR_FACING = { N: 'back', S: 'front', E: 'side', W: 'side' };
export const FLIP_FOR_FACING = { N: 1, S: 1, E: 1, W: -1 };

const DEF = CHARACTERS.rumi;
const [VB_W, VB_H] = DEF.viewBox;

// The protagonist: Rumi the lion on the Companion rig — a structural copy
// of PathMaker's SlothWalker adapter. Locomotion (screen-space translate
// via cellScreen, stride lift, anticipation squash, E/W flip, tunnel
// opacity) lives on GameScreen shared values applied to wrappers here;
// personality (blink, gaze, cheeks, tail swish, moods, reactions) lives
// inside Companion, reached via `mood` and the forwarded `react()` ref.
const LionWalker = forwardRef(function LionWalker(
  {
    cx,
    cy,
    lift,
    squash = null,
    flip = null,
    opacity = null,
    view = 'front',
    gazeTarget = null,
    mood = 'idle',
    size = 58,
  },
  ref
) {
  const companionRef = useRef(null);
  useImperativeHandle(ref, () => ({
    react: (type) => companionRef.current?.react(type),
  }));

  const W = size * (VB_W / VB_H);
  // Plant Rumi's paws just below the diamond's visual center so he reads
  // as standing ON the slab, not floating over it.
  const feetPx = size * (DEF.feetY / VB_H);
  const FOOT_DROP = 8;

  const moveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - W / 2 },
      { translateY: cy.value + FOOT_DROP - feetPx },
    ],
    opacity: opacity ? opacity.value : 1,
  }));

  // squash > 1 = wide + flat (anticipation coil); flip is ±1 and composes
  // with it on scaleX — the same convention as PathMaker.
  const poseStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift ? lift.value : 0 },
      { scaleX: (flip ? flip.value : 1) * (squash ? squash.value : 1) },
      { scaleY: squash ? 2 - squash.value : 1 },
    ],
  }));

  return (
    <Animated.View style={[styles.wrapper, { width: W, height: size }, moveStyle]} pointerEvents="none">
      <Animated.View style={poseStyle}>
        <Companion
          ref={companionRef}
          character="rumi"
          size={size}
          mood={mood}
          view={view}
          gazeTarget={gazeTarget}
          anchor={ORIGIN}
        />
      </Animated.View>
    </Animated.View>
  );
});

// Zero anchor: gazeTarget shared values are a pure DIRECTION vector — the
// walker moves via shared values without re-rendering, so a screen-position
// anchor would go stale immediately (PathMaker precedent).
const ORIGIN = { x: 0, y: 0 };

export default LionWalker;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
});
