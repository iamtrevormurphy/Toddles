import React, { useEffect } from 'react';
import { initAudio } from '../../utils/sound';
import { PATHMAKER_LEVELS } from './levels';
import GameScreen from './GameScreen';

// Path-Maker entry. Phase 1 ships a single hardcoded level with no
// picker — level-select arrives in Phase 3 alongside the authored
// curriculum, mirroring Tangram/NumberMarble's shape.
export default function PathMaker({ navigation }) {
  useEffect(() => {
    initAudio();
  }, []);

  return <GameScreen level={PATHMAKER_LEVELS[0]} navigation={navigation} />;
}
