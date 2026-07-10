import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { COLORS, RADII, SHADOWS, TYPE } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import BackButton from '../../components/BackButton';
import GradientBackground from '../../components/GradientBackground';
import { DifficultyDots } from '../../components/icons';
import PuzzlePreview from './PuzzlePreview';
import { getPuzzlesBySection } from './puzzles';

export default function PuzzlePicker({ section, title, onSelect, onBack }) {
  const { width } = useWindowDimensions();
  const cardSize = (width - 16 * 4) / 3;

  return (
    <View style={styles.container}>
      <GradientBackground name="dusk" />
      <BackButton onPress={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.grid}>
          {getPuzzlesBySection(section).map((puzzle) => (
            <TouchableOpacity
              key={puzzle.id}
              style={[styles.card, { width: cardSize }]}
              activeOpacity={0.7}
              onPress={() => {
                tapHaptic();
                onSelect(puzzle.id);
              }}
            >
              <PuzzlePreview puzzle={puzzle} size={cardSize - 24} extruded />
              <Text style={styles.cardName}>{puzzle.name}</Text>
              <View style={styles.cardDots}>
                <DifficultyDots level={puzzle.difficulty} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    ...TYPE.title,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.md,
    paddingVertical: 12,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  cardName: {
    ...TYPE.heading,
    fontSize: 20,
    color: COLORS.textDark,
    marginTop: 6,
  },
  cardDots: {
    marginTop: 6,
  },
});
