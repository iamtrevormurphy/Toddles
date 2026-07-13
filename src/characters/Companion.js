import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { DEPTH } from '../constants/theme';
import { CHARACTER_COLORS, extrudeSidePath, polyPath, resolveColor, sideColor } from './parts';
import { BLINK_INTERVALS, MOODS, REACTIONS } from './moods';
import pip from './defs/pip';
import juno from './defs/juno';
import miso from './defs/miso';
import lento from './defs/lento';

export const CHARACTERS = { pip, juno, miso, lento };

// The Shapefolk rig. One component renders any character def:
// - whole-body motion (bob/hop/tilt/squash) on wrapper Animated.Views —
//   the pattern proven in this codebase; no SVG animatedProps needed
// - pupils/cheeks are tiny overlay Views; appendages are their own Svg
//   layers rotated about their joint via a translate sandwich
// - mood loops come from MOODS config; one-shots via ref.react(type)
// - "watching" derives on the UI thread from gazeTarget shared values
// Always pointerEvents="none"; never covers touch targets (characters.md).
const Companion = forwardRef(function Companion(
  { character = 'pip', size = 80, mood = 'idle', gazeTarget = null, anchor = null, hintTarget = null },
  ref
) {
  const def = CHARACTERS[character];
  const [vbW, vbH] = def.viewBox;
  const px = size / vbH; // viewBox unit → screen px
  const W = vbW * px;
  const H = vbH * px;

  // Whole-body values
  const bobY = useSharedValue(0);
  const hopY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const squash = useSharedValue(1);
  // Feature values
  const appRot = useSharedValue(0);
  const cheeks = useSharedValue(0);
  const blink = useSharedValue(1); // pupil scaleY
  const moodCheeksRef = useRef(0);

  // Hint direction: +1 target is to the right of the companion, -1 left
  const hintSign =
    hintTarget && anchor ? (hintTarget.x >= anchor.x ? 1 : -1) : 1;

  // --- Mood loops ---------------------------------------------------------
  useEffect(() => {
    const config = MOODS[mood] || MOODS.idle;
    moodCheeksRef.current = config.cheeks;
    [bobY, hopY, appRot, cheeks, tilt].forEach(cancelAnimation);

    if (config.bob) {
      bobY.value = withRepeat(
        withSequence(
          withTiming(-config.bob.amp, { duration: config.bob.duration / 2 }),
          withTiming(0, { duration: config.bob.duration / 2 })
        ),
        -1
      );
    } else {
      bobY.value = withTiming(0, { duration: 200 });
    }

    if (config.hop) {
      hopY.value = withRepeat(
        withSequence(
          withTiming(-config.hop.height, { duration: config.hop.duration * 0.45 }),
          withTiming(0, { duration: config.hop.duration * 0.55 })
        ),
        -1
      );
    } else {
      hopY.value = withTiming(0, { duration: 200 });
    }

    if (config.appendage) {
      appRot.value = withRepeat(
        withSequence(
          withTiming(config.appendage.from, { duration: config.appendage.duration / 2 }),
          withTiming(config.appendage.to, { duration: config.appendage.duration / 2 })
        ),
        -1,
        true
      );
    } else if (config.appendagePoint != null) {
      appRot.value = withSpring(config.appendagePoint * hintSign, { damping: 16 });
    } else {
      appRot.value = withTiming(0, { duration: 250 });
    }

    cheeks.value = withTiming(config.cheeks, { duration: 300 });
    tilt.value = withSpring(config.lean * hintSign, { damping: 18 });

    return () => [bobY, hopY, appRot, cheeks, tilt].forEach(cancelAnimation);
  }, [mood, hintSign]);

  // --- Autonomous blink (JS-side scheduler, precomputed jitter) -----------
  // Defs may override the lid speed (Lento's slow blink); default is the
  // original quick cadence.
  const blinkSpeed = def.blink || { close: 70, open: 110 };
  useEffect(() => {
    let timer;
    let i = 0;
    const schedule = () => {
      timer = setTimeout(() => {
        blink.value = withSequence(
          withTiming(0.18, { duration: blinkSpeed.close }),
          withTiming(1, { duration: blinkSpeed.open })
        );
        i += 1;
        schedule();
      }, BLINK_INTERVALS[i % BLINK_INTERVALS.length]);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [def]);

  // --- Gaze: derived on the UI thread, zero renders during drags ----------
  const maxGaze = def.eyes.maxGaze * px;
  const gazeDX = useDerivedValue(() => {
    if (!gazeTarget || !anchor || gazeTarget.active.value === 0) {
      return withSpring(0, { damping: 18 });
    }
    const dx = gazeTarget.x.value - anchor.x;
    const dy = gazeTarget.y.value - anchor.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return withSpring((dx / len) * maxGaze, { damping: 20 });
  });
  const gazeDY = useDerivedValue(() => {
    if (!gazeTarget || !anchor || gazeTarget.active.value === 0) {
      return withSpring(0, { damping: 18 });
    }
    const dx = gazeTarget.x.value - anchor.x;
    const dy = gazeTarget.y.value - anchor.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return withSpring((dy / len) * maxGaze, { damping: 20 });
  });
  const gazeLean = useDerivedValue(() => {
    if (!gazeTarget || !anchor || gazeTarget.active.value === 0) {
      return withSpring(0, { damping: 18 });
    }
    const dx = gazeTarget.x.value - anchor.x;
    return withSpring(Math.sign(dx) * 3, { damping: 20 });
  });

  // --- One-shot reactions --------------------------------------------------
  useImperativeHandle(ref, () => ({
    react(type) {
      const r = REACTIONS[type];
      if (!r) return;
      if (r.hop) {
        hopY.value = withSequence(
          withTiming(r.hop.up, { duration: r.hop.upDuration }),
          withSpring(0, { damping: r.hop.settleDamping, stiffness: 200 })
        );
      }
      if (r.squash) {
        squash.value = withSequence(
          ...r.squash.map((s) => withTiming(s, { duration: 130 }))
        );
      }
      if (r.cheeksFlash) {
        cheeks.value = withTiming(1, { duration: 120 });
        setTimeout(() => {
          cheeks.value = withTiming(moodCheeksRef.current, { duration: 400 });
        }, r.cheeksFlash);
      }
      if (r.appendageFlick) {
        appRot.value = withSequence(
          withTiming(r.appendageFlick.deg, { duration: r.appendageFlick.duration }),
          withSpring(0, { damping: 14 })
        );
      }
      if (r.appendageSwings) {
        appRot.value = withSequence(
          ...r.appendageSwings.degs.map((deg) =>
            withTiming(deg, { duration: r.appendageSwings.duration })
          )
        );
      }
      if (r.tiltShake) {
        const seq = [];
        for (let i = 0; i < r.tiltShake.count; i++) {
          seq.push(withTiming(-r.tiltShake.deg, { duration: r.tiltShake.duration }));
          seq.push(withTiming(r.tiltShake.deg, { duration: r.tiltShake.duration }));
        }
        seq.push(withSpring(0, { damping: 16 }));
        tilt.value = withSequence(...seq);
      }
      if (r.nodDips) {
        const seq = [];
        for (let i = 0; i < r.nodDips.count; i++) {
          seq.push(withTiming(r.nodDips.dip, { duration: r.nodDips.duration }));
          seq.push(withTiming(0, { duration: r.nodDips.duration }));
        }
        hopY.value = withSequence(...seq);
      }
    },
  }));

  // --- Animated styles ------------------------------------------------------
  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value + hopY.value }],
  }));

  const feetPin = def.feetY * px - H / 2;
  const innerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tilt.value + gazeLean.value}deg` },
      { translateY: feetPin },
      { scaleY: squash.value },
      { scaleX: 1 + (1 - squash.value) * 0.7 },
      { translateY: -feetPin },
    ],
  }));

  const pupilStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: gazeDX.value },
      { translateY: gazeDY.value },
      { scaleY: blink.value },
    ],
  }));

  const cheeksStyle = useAnimatedStyle(() => ({ opacity: cheeks.value }));

  // --- Static geometry (computed once per def/size) -------------------------
  const body = useMemo(() => {
    const sides = def.masses.map((m) => ({
      d: extrudeSidePath(m.verts),
      fill: sideColor(m.color),
    }));
    const faces = def.masses.map((m) => ({
      d: polyPath(m.verts),
      fill: resolveColor(m.color),
    }));
    return { sides, faces };
  }, [def]);

  const renderAppendage = (a) => (
    <Appendage key={`${def.id}-${a.id}`} def={a} appRot={appRot} px={px} W={W} H={H} vbW={vbW} vbH={vbH} />
  );

  const eyeR = def.eyes.radius * px;
  const cheekR = def.cheeks.radius * px;

  // Ground shadow stays on the ground: static layer outside the hop/bob
  // transform, shrinking slightly as the character rises.
  const shadowStyle = useAnimatedStyle(() => {
    const lift = Math.min(0, bobY.value + hopY.value); // negative when airborne
    const s = 1 + lift * 0.02;
    return {
      transform: [
        { translateX: def.shadow.cx * px - W / 2 },
        { scaleX: s },
        { scaleY: s },
        { translateX: -(def.shadow.cx * px - W / 2) },
      ],
      opacity: 1 + lift * 0.02,
    };
  });

  return (
    <View pointerEvents="none" style={{ width: W, height: H }}>
      <Animated.View style={[StyleSheet.absoluteFill, shadowStyle]}>
        <Svg width={W} height={H} viewBox={`0 0 ${vbW} ${vbH}`}>
          {DEPTH.groundShadow.map((s, i) => (
            <Ellipse
              key={i}
              cx={def.shadow.cx}
              cy={def.shadow.cy}
              rx={def.shadow.rx * s.spread}
              ry={3.2 * s.spread}
              fill={CHARACTER_COLORS.ink}
              opacity={s.opacity}
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[{ width: W, height: H }, outerStyle]}>
        <Animated.View style={[{ width: W, height: H }, innerStyle]}>
          {def.appendages.filter((a) => a.layer === 'behind').map(renderAppendage)}

          <Svg width={W} height={H} viewBox={`0 0 ${vbW} ${vbH}`}>
            {/* 2.5D masses: all sides, then all faces */}
            {body.sides.map((s, i) => (
              <Path key={`s${i}`} d={s.d} fill={s.fill} stroke={s.fill} strokeWidth={0.5} />
            ))}
            {body.faces.map((f, i) => (
              <Path key={`f${i}`} d={f.d} fill={f.fill} />
            ))}
            {/* static details */}
            {def.details.map((d, i) =>
              d.type === 'circle' ? (
                <Circle key={`d${i}`} cx={d.cx} cy={d.cy} r={d.r} fill={resolveColor(d.color)} />
              ) : (
                <Path key={`d${i}`} d={polyPath(d.verts)} fill={resolveColor(d.color)} />
              )
            )}
          </Svg>

          {def.appendages.filter((a) => a.layer === 'front').map(renderAppendage)}

          {/* pupils + glints (overlay Views — reliable on native AND web) */}
          {[def.eyes.left, def.eyes.right].map(([ex, ey], i) => (
            <Animated.View
              key={`eye${i}`}
              style={[
                styles.dot,
                {
                  left: ex * px - eyeR,
                  top: ey * px - eyeR,
                  width: eyeR * 2,
                  height: eyeR * 2,
                  borderRadius: eyeR,
                  backgroundColor: CHARACTER_COLORS.ink,
                },
                pupilStyle,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    left: eyeR * 0.55,
                    top: eyeR * 0.3,
                    width: eyeR * 0.6,
                    height: eyeR * 0.6,
                    borderRadius: eyeR * 0.3,
                    backgroundColor: CHARACTER_COLORS.white,
                  },
                ]}
              />
            </Animated.View>
          ))}

          {/* cheeks */}
          <Animated.View style={[StyleSheet.absoluteFill, cheeksStyle]}>
            {def.cheeks.points.map(([cx, cy], i) => (
              <View
                key={`cheek${i}`}
                style={[
                  styles.dot,
                  {
                    left: cx * px - cheekR,
                    top: cy * px - cheekR,
                    width: cheekR * 2,
                    height: cheekR * 2,
                    borderRadius: cheekR,
                    backgroundColor: CHARACTER_COLORS.rose,
                    opacity: 0.85,
                  },
                ]}
              />
            ))}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

// Appendage layer: full-viewBox Svg rotated about its joint via a
// translate sandwich (RN rotates about center by default).
function Appendage({ def, appRot, px, W, H, vbW, vbH }) {
  const ox = def.origin[0] * px - W / 2;
  const oy = def.origin[1] * px - H / 2;
  const style = useAnimatedStyle(() => {
    const deg = def.mirror ? -appRot.value : appRot.value;
    return {
      transform: [
        { translateX: ox },
        { translateY: oy },
        { rotate: `${deg}deg` },
        { translateX: -ox },
        { translateY: -oy },
      ],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={W} height={H} viewBox={`0 0 ${vbW} ${vbH}`}>
        {def.polys.map((p, i) => (
          <Path key={i} d={polyPath(p.verts)} fill={resolveColor(p.color)} />
        ))}
      </Svg>
    </Animated.View>
  );
}

export default Companion;

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
  },
});
