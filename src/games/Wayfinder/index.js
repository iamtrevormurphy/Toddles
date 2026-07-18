import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AmbientClouds from '../../components/AmbientClouds';
import GradientBackground from '../../components/GradientBackground';
import { initAudio } from '../../utils/sound';
import { WAYFINDER_LEVELS, getLevelById, getNextLevel } from './levels';
import GameScreen from './GameScreen';

// Wayfinder entry — the PathMaker pattern verbatim: levels play in
// curriculum order, GameScreen is `key`d on the level id so every level
// starts with fresh state for free, and the sky (the app's darkest —
// GRADIENTS.night — plus the ambient clouds) lives OUTSIDE that remount
// boundary so the drift runs continuously across the whole session.
export default function Wayfinder({ navigation, route }) {
  // route.params.level: dev/testing entry to a specific level (the child's
  // flow always starts at level 1 from the home card).
  const [levelId, setLevelId] = useState(route?.params?.level ?? WAYFINDER_LEVELS[0].id);
  const level = getLevelById(levelId);

  useEffect(() => {
    initAudio();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground name="night" />
      <AmbientClouds />
      <GameScreen
        key={level.id}
        level={level}
        onNext={() => setLevelId(getNextLevel(level.id).id)}
        navigation={navigation}
      />
    </View>
  );
}
