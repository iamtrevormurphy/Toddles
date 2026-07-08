import React, { useEffect, useState } from 'react';
import { initAudio } from '../../utils/sound';
import { getPuzzleById, getNextPuzzle } from './puzzles';
import PuzzlePicker from './PuzzlePicker';
import GameScreen from './GameScreen';

// Tangram entry: picker <-> play. Back from play returns to the picker; back
// from the picker leaves the game.
export default function Tangram({ navigation }) {
  const [puzzleId, setPuzzleId] = useState(null);

  useEffect(() => {
    initAudio();
  }, []);

  if (!puzzleId) {
    return <PuzzlePicker onSelect={setPuzzleId} onBack={() => navigation.goBack()} />;
  }

  const puzzle = getPuzzleById(puzzleId);
  return (
    <GameScreen
      key={puzzleId}
      puzzle={puzzle}
      onBack={() => setPuzzleId(null)}
      onNext={() => setPuzzleId(getNextPuzzle(puzzleId).id)}
      onPickMore={() => setPuzzleId(null)}
    />
  );
}
