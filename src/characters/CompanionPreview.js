import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, TYPE } from '../constants/theme';
import GradientBackground from '../components/GradientBackground';
import BackButton from '../components/BackButton';
import Companion, { CHARACTERS } from './Companion';
import { MOODS, REACTIONS } from './moods';

// Dev-only workbench for the Shapefolk rig: switch characters, drive moods,
// fire reactions, and drag the dot to test gaze tracking. Registered in the
// navigator behind __DEV__ only.
export default function CompanionPreview({ navigation }) {
  const { width } = useWindowDimensions();
  const [character, setCharacter] = useState('pip');
  const [mood, setMood] = useState('idle');
  const companionRef = useRef(null);

  const anchor = { x: width / 2, y: 240 };
  const gaze = {
    x: useSharedValue(width / 2),
    y: useSharedValue(420),
    active: useSharedValue(0),
  };

  const dotPan = Gesture.Pan()
    .onStart(() => {
      gaze.active.value = 1;
    })
    .onUpdate((e) => {
      gaze.x.value = e.absoluteX;
      gaze.y.value = e.absoluteY;
    })
    .onEnd(() => {
      gaze.active.value = 0;
    });

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gaze.x.value - 22 }, { translateY: gaze.y.value - 22 }],
    opacity: gaze.active.value ? 1 : 0.55,
  }));

  return (
    <View style={styles.container}>
      <GradientBackground name="dawn" />
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Shapefolk</Text>

      <View style={styles.stage}>
        <Companion
          ref={companionRef}
          character={character}
          size={150}
          mood={mood}
          gazeTarget={gaze}
          anchor={anchor}
          hintTarget={{ x: width / 2 - 120, y: 560 }}
        />
      </View>

      <View style={styles.controls}>
        <Row
          items={Object.keys(CHARACTERS)}
          active={character}
          onPress={setCharacter}
        />
        <Row items={Object.keys(MOODS)} active={mood} onPress={setMood} />
        <Row
          items={Object.keys(REACTIONS)}
          onPress={(t) => companionRef.current?.react(t)}
        />
      </View>

      <GestureDetector gesture={dotPan}>
        <Animated.View style={[styles.gazeDot, dotStyle]} />
      </GestureDetector>
    </View>
  );
}

function Row({ items, active, onPress }) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <TouchableOpacity
          key={item}
          style={[styles.chip, active === item && styles.chipActive]}
          onPress={() => onPress(item)}
        >
          <Text style={[styles.chipText, active === item && styles.chipTextActive]}>
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    ...TYPE.title,
    color: COLORS.textDark,
    textAlign: 'center',
    marginTop: 60,
  },
  stage: {
    alignItems: 'center',
    marginTop: 40,
    height: 200,
  },
  controls: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...SHADOWS.card,
  },
  chipActive: {
    backgroundColor: COLORS.bubbleOrange,
  },
  chipText: {
    ...TYPE.label,
    color: COLORS.textDark,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  gazeDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bubbleBlue,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
});
