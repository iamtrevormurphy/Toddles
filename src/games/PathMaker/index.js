import React, { useEffect, useState } from 'react';
import { initAudio } from '../../utils/sound';
import { PATHMAKER_LEVELS, getLevelById, getNextLevel } from './levels';
import GameScreen from './GameScreen';

// Path-Maker entry. Levels always play in curriculum order (no picker —
// each level assumes the mechanics the previous one taught). `key`d on
// the level id so GameScreen remounts fresh per level (all its track/
// phase/shared-value state resets for free), the same trick Tangram's
// index.js uses for puzzle switches.
export default function PathMaker({ navigation }) {
  const [levelId, setLevelId] = useState(PATHMAKER_LEVELS[0].id);
  const level = getLevelById(levelId);

  useEffect(() => {
    initAudio();
  }, []);

  return (
    <GameScreen
      key={level.id}
      level={level}
      onNext={() => setLevelId(getNextLevel(level.id).id)}
      navigation={navigation}
    />
  );
}
