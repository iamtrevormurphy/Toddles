import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { COLORS } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import BackButton from '../../components/BackButton';
import PuzzlePreview from './PuzzlePreview';
import { getPuzzlesBySection } from './puzzles';

const SECTIONS = [
  { id: 'numbers', title: 'Numbers' },
  { id: 'animals', title: 'Animals' },
];

export default function PuzzlePicker({ onSelect, onBack }) {
  const { width } = useWindowDimensions();
  const cardSize = (width - 16 * 4) / 3;

  return (
    <View style={styles.container}>
      <BackButton onPress={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Pick a picture!</Text>
        {SECTIONS.map((section) => (
          <View key={section.id}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {getPuzzlesBySection(section.id).map((puzzle) => (
                <TouchableOpacity
                  key={puzzle.id}
                  style={[styles.card, { width: cardSize }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    tapHaptic();
                    onSelect(puzzle.id);
                  }}
                >
                  <PuzzlePreview puzzle={puzzle} size={cardSize - 24} />
                  <Text style={styles.cardName}>{puzzle.name}</Text>
                  <Text style={styles.cardStars}>{'⭐'.repeat(puzzle.difficulty)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSky,
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 6,
  },
  cardStars: {
    fontSize: 10,
    marginTop: 2,
  },
});
