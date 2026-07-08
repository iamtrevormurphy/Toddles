import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, MARBLE_COLORS, RADII, SHADOWS, TYPE, shade } from '../constants/theme';
import GradientBackground from '../components/GradientBackground';
import { Companion } from '../characters';
import PuzzlePreview from '../games/Tangram/PuzzlePreview';
import { getPuzzleById } from '../games/Tangram/puzzles';

// Tangram card art: the bird puzzle IS Pip's silhouette — the brand loop.
const birdPuzzle = getPuzzleById('bird');

function MarblesArt({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={38} cy={58} r={26} fill={MARBLE_COLORS.marble} />
      <Circle cx={30} cy={49} r={7} fill={MARBLE_COLORS.marbleShine} opacity={0.55} />
      <Circle cx={72} cy={44} r={19} fill={shade(MARBLE_COLORS.marble, -0.25)} />
      <Circle cx={66} cy={38} r={5} fill={MARBLE_COLORS.marbleShine} opacity={0.55} />
    </Svg>
  );
}

function GameCard({ title, art, tint, onPress }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 20, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 220 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[styles.gameCard, animatedStyle]}>
        <View style={[styles.artWell, { backgroundColor: tint }]}>{art}</View>
        <Text style={styles.gameTitle}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <GradientBackground name="dawn" />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Toddles</Text>
          <View style={styles.greeter}>
            <Companion character="miso" size={72} mood="idle" />
          </View>
        </View>
        <Text style={styles.subtitle}>Tap to play!</Text>
      </View>

      <View style={styles.gamesGrid}>
        <GameCard
          title="Tangram"
          tint="rgba(95, 168, 160, 0.14)"
          art={<PuzzlePreview puzzle={birdPuzzle} size={96} />}
          onPress={() => navigation.navigate('Tangram')}
        />
        <GameCard
          title="Marbles"
          tint="rgba(107, 91, 149, 0.12)"
          art={<MarblesArt size={96} />}
          onPress={() => navigation.navigate('NumberMarble')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  title: {
    ...TYPE.display,
    color: COLORS.textDark,
  },
  greeter: {
    marginBottom: 2,
  },
  subtitle: {
    ...TYPE.heading,
    color: COLORS.textLight,
    marginTop: 6,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  gameCard: {
    width: 150,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 16,
    ...SHADOWS.card,
  },
  artWell: {
    width: 118,
    height: 118,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTitle: {
    ...TYPE.heading,
    color: COLORS.textDark,
  },
});
