import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AmbientClouds from '../../components/AmbientClouds';
import GradientBackground from '../../components/GradientBackground';
import { initAudio } from '../../utils/sound';
import { PATHMAKER_LEVELS, getLevelById, getNextLevel } from './levels';
import GameScreen from './GameScreen';

// Path-Maker entry. Levels always play in curriculum order (no picker —
// each level assumes the mechanics the previous one taught). `key`d on
// the level id so GameScreen remounts fresh per level (all its track/
// phase/shared-value state resets for free), the same trick Tangram's
// index.js uses for puzzle switches.
//
// The sky (gradient + AmbientClouds) is rendered HERE, outside that
// remount boundary, and GameScreen no longer renders its own
// GradientBackground — it needs to paint UNDER every level's content but
// behind a remounting GameScreen would either restart on every level
// (if placed inside it) or paint on top of the board/track (if placed
// as a later, unindexed sibling outside it, since only BackButton/the
// level counter carry an explicit zIndex). Owning the sky here, as the
// first two children before GameScreen, keeps the paint order correct
// (sky → clouds → game) and lets the ambient drift run continuously
// across the whole session.
export default function PathMaker({ navigation }) {
  const [levelId, setLevelId] = useState(PATHMAKER_LEVELS[0].id);
  const level = getLevelById(levelId);

  useEffect(() => {
    initAudio();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground name="dusk" />
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
