import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Companion, CHARACTERS } from '../../characters';

// N points up on screen since board y grows south (down) and facing 'N'
// is dy:-1 in grid.js — so this mapping stays consistent with the grid.
// Consumed by GameScreen's turn accumulation and by FacingChevron.
export const FACING_DEGREES = { N: 0, E: 90, S: 180, W: 270 };

const DEF = CHARACTERS.lento;
const [VB_W, VB_H] = DEF.viewBox;

// The protagonist: Lento the sloth, a real Shapefolk on the Companion rig
// (NumberMarble's Character.js adapter precedent, extended for a walker).
// The split of responsibilities:
//   - locomotion (board-space translate, step lift, anticipation squash,
//     E/W flip) lives on GameScreen shared values applied to the wrappers
//     here — this component never computes game rules or timing;
//   - personality (blink, gaze, cheeks, arm sway, moods, one-shot
//     reactions) lives inside Companion, reached via `mood` and the
//     forwarded `react()` ref.
// The body never rotates to face N/E/S/W — a standing figure would read
// wrong sideways. Facing is cued by FacingChevron (exact), scaleX flip
// (E/W), and Lento's pupils gazing one tile ahead via `gazeTarget`.
const SlothWalker = forwardRef(function SlothWalker(
  { cx, cy, lift, squash = null, flip = null, gazeTarget = null, mood = 'idle', size = 58 },
  ref
) {
  const companionRef = useRef(null);
  useImperativeHandle(ref, () => ({
    react: (type) => companionRef.current?.react(type),
  }));

  const W = size * (VB_W / VB_H);
  // Plant Lento's feet just below the tile's visual center so he reads as
  // standing ON the slab, not floating over it.
  const feetPx = size * (DEF.feetY / VB_H);
  const FOOT_DROP = 12;

  const moveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - W / 2 },
      { translateY: cy.value + FOOT_DROP - feetPx },
    ],
  }));

  // squash > 1 = wide + flat (anticipation coil), same convention the
  // teardrop used; flip is ±1 and composes with it on scaleX.
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
          character="lento"
          size={size}
          mood={mood}
          gazeTarget={gazeTarget}
          anchor={ORIGIN}
        />
      </Animated.View>
    </Animated.View>
  );
});

// With a zero anchor, the gazeTarget shared values are interpreted as a
// pure DIRECTION vector — the walker moves via shared values without
// re-rendering, so a screen-position anchor would go stale immediately.
const ORIGIN = { x: 0, y: 0 };

export default SlothWalker;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
});
