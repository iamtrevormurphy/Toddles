// Number Marble level definitions
// Each level requires at least one split or selective combine
// Starting sum is always greater than target

export const LEVELS = [
  // TIER 1: Introduction (Levels 1-5) - Simple splits or selective combines
  {
    id: 1,
    target: 5,
    marbles: [6, 2],
    hint: 'Split the 6, then combine!',
  },
  {
    id: 2,
    target: 4,
    marbles: [7],
    hint: 'Split the marble to find 4!',
  },
  {
    id: 3,
    target: 6,
    marbles: [5, 4],
    hint: 'Split one marble, then add.',
  },
  {
    id: 4,
    target: 7,
    marbles: [10],
    hint: 'Split twice to make 7!',
  },
  {
    id: 5,
    target: 8,
    marbles: [6, 5],
    hint: 'Split the 6!',
  },

  // TIER 2: Intermediate (Levels 6-10) - Multiple operations
  {
    id: 6,
    target: 9,
    marbles: [7, 6],
    hint: 'Split the bigger marble.',
  },
  {
    id: 7,
    target: 10,
    marbles: [9, 5, 3],
    hint: 'Split, then combine two 5s!',
  },
  {
    id: 8,
    target: 11,
    marbles: [8, 7],
    hint: 'Split the 8!',
  },
  {
    id: 9,
    target: 12,
    marbles: [10, 7],
    hint: 'Split the 10!',
  },
  {
    id: 10,
    target: 6,
    marbles: [11],
    hint: 'Split to find 6!',
  },

  // TIER 3: Advanced (Levels 11-15) - Chain operations
  {
    id: 11,
    target: 13,
    marbles: [9, 8],
    hint: 'Split the 8!',
  },
  {
    id: 12,
    target: 14,
    marbles: [10, 9],
    hint: 'Split the 10!',
  },
  {
    id: 13,
    target: 15,
    marbles: [11, 9],
    hint: 'Split the 11!',
  },
  {
    id: 14,
    target: 16,
    marbles: [12, 9],
    hint: 'Split the 9!',
  },
  {
    id: 15,
    target: 10,
    marbles: [9, 5, 4],
    hint: 'Split, then combine equals!',
  },

  // TIER 4: Expert (Levels 16-20) - Complex chains
  {
    id: 16,
    target: 18,
    marbles: [13, 10],
    hint: 'Split the 10!',
  },
  {
    id: 17,
    target: 20,
    marbles: [15, 11],
    hint: 'Split the 11!',
  },
  {
    id: 18,
    target: 8,
    marbles: [15],
    hint: 'Split to find 8!',
  },
  {
    id: 19,
    target: 17,
    marbles: [12, 10, 3],
    hint: 'Split the 10!',
  },
  {
    id: 20,
    target: 22,
    marbles: [16, 12],
    hint: 'Split the 12!',
  },
];

export function getLevelById(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

export function getNextLevel(currentId) {
  const currentIndex = LEVELS.findIndex((l) => l.id === currentId);
  const nextIndex = (currentIndex + 1) % LEVELS.length;
  return LEVELS[nextIndex];
}

export function getTotalLevels() {
  return LEVELS.length;
}
