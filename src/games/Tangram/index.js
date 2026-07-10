import React, { useEffect, useState } from 'react';
import { initAudio } from '../../utils/sound';
import { getPuzzleById, getNextPuzzle } from './puzzles';
import PuzzlePicker from './PuzzlePicker';
import GameScreen from './GameScreen';

// One Tangram component, three games. The route's `mode` param picks the
// puzzle section and the difficulty ladder's empty-slot rendering:
//   basic    — colored fills + dotted outlines (Numbers)
//   normal   — colored fills only (Letters)
//   advanced — one light seamless silhouette (Animals)
const MODES = {
  numbers: { section: 'numbers', renderMode: 'basic', pickerTitle: 'Pick a number!' },
  letters: { section: 'letters', renderMode: 'normal', pickerTitle: 'Pick a letter!' },
  animals: { section: 'animals', renderMode: 'advanced', pickerTitle: 'Pick an animal!' },
};

// Tangram entry: picker <-> play. Back from play returns to the picker; back
// from the picker leaves the game.
export default function Tangram({ navigation, route }) {
  const mode = MODES[route?.params?.mode] ?? MODES.numbers;
  const [puzzleId, setPuzzleId] = useState(null);

  useEffect(() => {
    initAudio();
  }, []);

  if (!puzzleId) {
    return (
      <PuzzlePicker
        section={mode.section}
        title={mode.pickerTitle}
        onSelect={setPuzzleId}
        onBack={() => navigation.goBack()}
      />
    );
  }

  const puzzle = getPuzzleById(puzzleId);
  return (
    <GameScreen
      key={puzzleId}
      puzzle={puzzle}
      renderMode={mode.renderMode}
      onBack={() => setPuzzleId(null)}
      onNext={() => setPuzzleId(getNextPuzzle(puzzleId).id)}
      onPickMore={() => setPuzzleId(null)}
    />
  );
}
