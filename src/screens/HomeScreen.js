import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Path } from 'react-native-svg';
import { COLORS, MARBLE_COLORS, RADII, SHADOWS, TYPE, shade } from '../constants/theme';
import GradientBackground from '../components/GradientBackground';
import { Companion } from '../characters';
import PuzzlePreview from '../games/Tangram/PuzzlePreview';
import { getPuzzleById } from '../games/Tangram/puzzles';

// Animals card art: the bird puzzle IS Pip's silhouette — the brand loop.
const birdPuzzle = getPuzzleById('bird');
const numberPuzzle = getPuzzleById('number-2');
const letterPuzzle = getPuzzleById('letter-a');

const circlePath = (cx, cy, r) =>
  `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
// Bottom crescent shading (evenodd, clipped to the marble) — matches the
// in-game 2.5D marble face
const crescent = (cx, cy, r) => `${circlePath(cx, cy, r)} ${circlePath(cx, cy - r * 0.18, r)}`;

function MarblesArt({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="artMarbleA">
          <Circle cx={38} cy={58} r={26} />
        </ClipPath>
        <ClipPath id="artMarbleB">
          <Circle cx={72} cy={44} r={19} />
        </ClipPath>
      </Defs>
      <Circle cx={38} cy={58} r={26} fill={MARBLE_COLORS.marble} />
      <Path d={crescent(38, 58, 26)} fill="#3E3A5E" fillRule="evenodd" opacity={0.16} clipPath="url(#artMarbleA)" />
      <Circle cx={30} cy={49} r={7} fill={MARBLE_COLORS.marbleShine} opacity={0.55} />
      <Circle cx={72} cy={44} r={19} fill={shade(MARBLE_COLORS.marble, -0.25)} />
      <Path d={crescent(72, 44, 19)} fill="#3E3A5E" fillRule="evenodd" opacity={0.13} clipPath="url(#artMarbleB)" />
      <Circle cx={66} cy={38} r={5} fill={MARBLE_COLORS.marbleShine} opacity={0.55} />
    </Svg>
  );
}

// Path-Maker card art: a placeholder L-shaped path from a small character
// to a flag — swap for real brand art once the game's visual polish phase
// lands.
function PathMakerArt({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50 82 L50 34 L74 34"
        stroke={COLORS.bubbleOrange}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={50} cy={82} r={8} fill={MARBLE_COLORS.marble} />
      <Path d="M74 22 L88 34 L74 46 Z" fill={shade(MARBLE_COLORS.marble, -0.25)} />
    </Svg>
  );
}

function GameCard({ title, kicker, art, tint, onPress }) {
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
        {kicker && <Text style={styles.gameKicker}>{kicker}</Text>}
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
          title="Numbers"
          kicker="Tangram"
          tint="rgba(240, 201, 135, 0.18)"
          art={<PuzzlePreview puzzle={numberPuzzle} size={96} />}
          onPress={() => navigation.navigate('TangramNumbers')}
        />
        <GameCard
          title="Letters"
          kicker="Tangram"
          tint="rgba(169, 155, 209, 0.16)"
          art={<PuzzlePreview puzzle={letterPuzzle} size={96} />}
          onPress={() => navigation.navigate('TangramLetters')}
        />
        <GameCard
          title="Animals"
          kicker="Tangram"
          tint="rgba(95, 168, 160, 0.14)"
          art={<PuzzlePreview puzzle={birdPuzzle} size={96} />}
          onPress={() => navigation.navigate('TangramAnimals')}
        />
        <GameCard
          title="Marbles"
          kicker="Math"
          tint="rgba(107, 91, 149, 0.12)"
          art={<MarblesArt size={96} />}
          onPress={() => navigation.navigate('NumberMarble')}
        />
        <GameCard
          title="Path-Maker"
          kicker="Logic"
          tint="rgba(217, 139, 163, 0.14)"
          art={<PathMakerArt size={96} />}
          onPress={() => navigation.navigate('PathMaker')}
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
  gameKicker: {
    ...TYPE.label,
    color: COLORS.textLight,
  },
  gameTitle: {
    ...TYPE.heading,
    color: COLORS.textDark,
  },
});
