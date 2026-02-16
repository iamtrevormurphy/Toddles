import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { COLORS, TOUCH } from '../constants/theme';

const { width } = Dimensions.get('window');

const games = [
  {
    id: 'bubble-pop',
    title: '🫧',
    subtitle: 'Bubbles',
    color: COLORS.bubbleBlue,
    screen: 'BubblePop',
  },
  {
    id: 'coming-soon-1',
    title: '🔷',
    subtitle: 'Shapes',
    color: COLORS.bubblePurple,
    screen: null,
    comingSoon: true,
  },
  {
    id: 'coming-soon-2',
    title: '🎨',
    subtitle: 'Colors',
    color: COLORS.bubbleOrange,
    screen: null,
    comingSoon: true,
  },
  {
    id: 'coming-soon-3',
    title: '🔢',
    subtitle: 'Numbers',
    color: COLORS.bubbleGreen,
    screen: null,
    comingSoon: true,
  },
];

export default function HomeScreen({ navigation }) {
  const handleGamePress = (game) => {
    if (game.screen && !game.comingSoon) {
      navigation.navigate(game.screen);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Toddles</Text>
        <Text style={styles.subtitle}>Tap to play!</Text>
      </View>

      <View style={styles.gamesGrid}>
        {games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameCard,
              { backgroundColor: game.color },
              game.comingSoon && styles.gameCardDisabled,
            ]}
            onPress={() => handleGamePress(game)}
            activeOpacity={game.comingSoon ? 1 : 0.7}
          >
            <Text style={styles.gameIcon}>{game.title}</Text>
            <Text style={styles.gameTitle}>{game.subtitle}</Text>
            {game.comingSoon && (
              <Text style={styles.comingSoon}>Soon!</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const cardSize = (width - 60) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 24,
    color: COLORS.textLight,
    marginTop: 8,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  gameCard: {
    width: cardSize,
    height: cardSize,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  gameCardDisabled: {
    opacity: 0.5,
  },
  gameIcon: {
    fontSize: 64,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 8,
  },
  comingSoon: {
    fontSize: 14,
    color: COLORS.white,
    marginTop: 4,
    opacity: 0.8,
  },
});
