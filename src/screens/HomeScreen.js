import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { COLORS, MARBLE_COLORS, RADII, SHADOWS, TYPE, shade } from '../constants/theme';
import GradientBackground from '../components/GradientBackground';
import { Companion, CHARACTER_COLORS } from '../characters';
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

// Path-Maker card art: mini Lento (the game's sloth protagonist — fawn
// head, cream face, cocoa eye-stripe mask) at the start of a terracotta
// path that leads to the goal-green tile. Same brand loop as the bird
// card: the art IS the character the child will meet inside.
function PathMakerArt({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={60} y={22} width={26} height={26} rx={6} fill={COLORS.bubbleGreen} />
      <Path
        d="M26 62 L26 35 L56 35"
        stroke={COLORS.bubbleOrange}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Lento head */}
      <Rect x={11} y={62} width={30} height={27} rx={7} fill={CHARACTER_COLORS.fawn} />
      <Rect x={14.5} y={66} width={23} height={16.5} rx={4} fill={CHARACTER_COLORS.white} />
      <Rect x={16} y={70.5} width={8.5} height={5} rx={2.5} fill={CHARACTER_COLORS.cocoa} />
      <Rect x={27.5} y={70.5} width={8.5} height={5} rx={2.5} fill={CHARACTER_COLORS.cocoa} />
      <Circle cx={20.5} cy={73} r={1.9} fill={CHARACTER_COLORS.ink} />
      <Circle cx={31.5} cy={73} r={1.9} fill={CHARACTER_COLORS.ink} />
      <Path d="M23.5 79 L28.5 79 L26 82 Z" fill={CHARACTER_COLORS.cocoa} />
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
