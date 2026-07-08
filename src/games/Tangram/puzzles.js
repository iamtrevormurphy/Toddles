// Puzzle catalog: numbers 1-9 and six animals.
//
// Authoring convention (keeps every seam exact — see scripts/validate-tangram.js):
// - Puzzle space is 320x320, base unit U = 20.
// - Slot (cx, cy) is the center of the shape's unrotated bounding box, always
//   a multiple of 10, so 90°-rotated pieces land on grid lines.
// - Rotations are 90° steps; the parallelogram provides 45° slants on its own.
// - Digits are blocky strokes built from 40x40 squares, with small triangles
//   for diagonals and parallelograms for the curved hooks of 2/3/5/6/9.

export const PUZZLES = [
  // ---------- Numbers ----------
  {
    id: 'number-1', name: '1', emoji: '1️⃣', section: 'numbers', difficulty: 1,
    slots: [
      { shape: 'square', cx: 180, cy: 120, rotation: 0 },
      { shape: 'square', cx: 180, cy: 160, rotation: 0 },
      { shape: 'square', cx: 180, cy: 200, rotation: 0 },
      { shape: 'smallTriangle', cx: 140, cy: 120, rotation: 90 }, // flag
    ],
  },
  {
    id: 'number-2', name: '2', emoji: '2️⃣', section: 'numbers', difficulty: 2,
    slots: [
      { shape: 'square', cx: 140, cy: 120, rotation: 0 }, // top bar
      { shape: 'square', cx: 180, cy: 120, rotation: 0 },
      { shape: 'parallelogram', cx: 160, cy: 160, rotation: 0 }, // diagonal
      { shape: 'square', cx: 140, cy: 200, rotation: 0 }, // bottom bar
      { shape: 'square', cx: 180, cy: 200, rotation: 0 },
    ],
  },
  {
    id: 'number-3', name: '3', emoji: '3️⃣', section: 'numbers', difficulty: 2,
    slots: [
      { shape: 'parallelogram', cx: 160, cy: 80, rotation: 0, flip: true }, // top hook
      { shape: 'square', cx: 180, cy: 120, rotation: 0 }, // right side
      { shape: 'square', cx: 140, cy: 160, rotation: 0 }, // middle nub
      { shape: 'square', cx: 180, cy: 160, rotation: 0 },
      { shape: 'square', cx: 180, cy: 200, rotation: 0 },
      { shape: 'parallelogram', cx: 160, cy: 240, rotation: 0 }, // bottom hook
    ],
  },
  {
    id: 'number-4', name: '4', emoji: '4️⃣', section: 'numbers', difficulty: 2,
    slots: [
      { shape: 'smallTriangle', cx: 140, cy: 120, rotation: 180 }, // diagonal
      { shape: 'square', cx: 140, cy: 160, rotation: 0 }, // crossbar
      { shape: 'square', cx: 180, cy: 120, rotation: 0 }, // right column
      { shape: 'square', cx: 180, cy: 160, rotation: 0 },
      { shape: 'square', cx: 180, cy: 200, rotation: 0 },
    ],
  },
  {
    id: 'number-5', name: '5', emoji: '5️⃣', section: 'numbers', difficulty: 3,
    slots: [
      { shape: 'square', cx: 140, cy: 80, rotation: 0 }, // top bar
      { shape: 'square', cx: 180, cy: 80, rotation: 0 },
      { shape: 'square', cx: 140, cy: 120, rotation: 0 }, // upper left
      { shape: 'parallelogram', cx: 160, cy: 160, rotation: 0, flip: true }, // S-curve
      { shape: 'square', cx: 180, cy: 200, rotation: 0 }, // lower right
      { shape: 'square', cx: 140, cy: 240, rotation: 0 }, // bottom bar
      { shape: 'square', cx: 180, cy: 240, rotation: 0 },
    ],
  },
  {
    id: 'number-6', name: '6', emoji: '6️⃣', section: 'numbers', difficulty: 2,
    slots: [
      { shape: 'parallelogram', cx: 160, cy: 100, rotation: 0 }, // top hook
      { shape: 'square', cx: 140, cy: 140, rotation: 0 }, // left column
      { shape: 'square', cx: 140, cy: 180, rotation: 0 }, // loop
      { shape: 'square', cx: 180, cy: 180, rotation: 0 },
      { shape: 'square', cx: 140, cy: 220, rotation: 0 },
      { shape: 'square', cx: 180, cy: 220, rotation: 0 },
    ],
  },
  {
    id: 'number-7', name: '7', emoji: '7️⃣', section: 'numbers', difficulty: 2,
    slots: [
      { shape: 'square', cx: 140, cy: 120, rotation: 0 }, // top bar
      { shape: 'square', cx: 180, cy: 120, rotation: 0 },
      { shape: 'smallTriangle', cx: 140, cy: 160, rotation: 90 }, // slant
      { shape: 'square', cx: 180, cy: 160, rotation: 0 }, // leg
      { shape: 'square', cx: 180, cy: 200, rotation: 0 },
    ],
  },
  {
    id: 'number-8', name: '8', emoji: '8️⃣', section: 'numbers', difficulty: 3,
    slots: [
      // top diamond
      { shape: 'smallTriangle', cx: 140, cy: 100, rotation: 180 },
      { shape: 'smallTriangle', cx: 180, cy: 100, rotation: 270 },
      { shape: 'smallTriangle', cx: 140, cy: 140, rotation: 90 },
      { shape: 'smallTriangle', cx: 180, cy: 140, rotation: 0 },
      // bottom diamond
      { shape: 'smallTriangle', cx: 140, cy: 180, rotation: 180 },
      { shape: 'smallTriangle', cx: 180, cy: 180, rotation: 270 },
      { shape: 'smallTriangle', cx: 140, cy: 220, rotation: 90 },
      { shape: 'smallTriangle', cx: 180, cy: 220, rotation: 0 },
    ],
  },
  {
    id: 'number-9', name: '9', emoji: '9️⃣', section: 'numbers', difficulty: 2,
    slots: [
      { shape: 'square', cx: 140, cy: 100, rotation: 0 }, // loop
      { shape: 'square', cx: 180, cy: 100, rotation: 0 },
      { shape: 'square', cx: 140, cy: 140, rotation: 0 },
      { shape: 'square', cx: 180, cy: 140, rotation: 0 },
      { shape: 'square', cx: 180, cy: 180, rotation: 0 }, // right column
      { shape: 'parallelogram', cx: 160, cy: 220, rotation: 0 }, // tail hook
    ],
  },

  // ---------- Animals ----------
  {
    id: 'fish', name: 'Fish', emoji: '🐟', section: 'animals', difficulty: 1,
    slots: [
      { shape: 'largeTriangle', cx: 140, cy: 160, rotation: 0 },   // body
      { shape: 'largeTriangle', cx: 140, cy: 160, rotation: 180 },
      { shape: 'smallTriangle', cx: 200, cy: 140, rotation: 180 }, // tail top
      { shape: 'smallTriangle', cx: 200, cy: 180, rotation: 90 },  // tail bottom
    ],
  },
  {
    id: 'duck', name: 'Duck', emoji: '🦆', section: 'animals', difficulty: 2,
    slots: [
      { shape: 'largeTriangle', cx: 180, cy: 180, rotation: 270 }, // body, back slopes down
      { shape: 'square', cx: 120, cy: 120, rotation: 0 },          // head
      { shape: 'square', cx: 120, cy: 160, rotation: 0 },          // breast
      { shape: 'smallTriangle', cx: 80, cy: 120, rotation: 180 },  // bill
      { shape: 'smallTriangle', cx: 240, cy: 200, rotation: 270 }, // tail
    ],
  },
  {
    id: 'bird', name: 'Bird', emoji: '🐦', section: 'animals', difficulty: 2,
    slots: [
      { shape: 'mediumTriangle', cx: 170, cy: 180, rotation: 90 }, // body
      { shape: 'parallelogram', cx: 200, cy: 130, rotation: 0 },   // swept wing
      { shape: 'square', cx: 140, cy: 130, rotation: 0 },          // head
      { shape: 'smallTriangle', cx: 100, cy: 130, rotation: 180 }, // beak
      { shape: 'smallTriangle', cx: 220, cy: 170, rotation: 270 }, // tail
    ],
  },
  {
    id: 'cat', name: 'Cat', emoji: '🐱', section: 'animals', difficulty: 2,
    slots: [
      { shape: 'square', cx: 110, cy: 140, rotation: 0 },           // head
      { shape: 'smallTriangle', cx: 90, cy: 100, rotation: 270 },   // left ear
      { shape: 'smallTriangle', cx: 130, cy: 100, rotation: 180 },  // right ear
      { shape: 'largeTriangle', cx: 130, cy: 200, rotation: 90 },   // body
      { shape: 'mediumTriangle', cx: 140, cy: 210, rotation: 270 }, // chest
      { shape: 'parallelogram', cx: 210, cy: 220, rotation: 0 },    // tail, tip up
    ],
  },
  {
    id: 'dog', name: 'Dog', emoji: '🐶', section: 'animals', difficulty: 2,
    slots: [
      { shape: 'square', cx: 140, cy: 140, rotation: 0 },          // head
      { shape: 'smallTriangle', cx: 100, cy: 140, rotation: 90 },  // snout
      { shape: 'smallTriangle', cx: 160, cy: 100, rotation: 180 }, // ear
      { shape: 'largeTriangle', cx: 180, cy: 200, rotation: 0 },   // body
      { shape: 'largeTriangle', cx: 180, cy: 200, rotation: 180 },
      { shape: 'smallTriangle', cx: 220, cy: 140, rotation: 180 }, // tail
    ],
  },
  {
    id: 'rabbit', name: 'Rabbit', emoji: '🐰', section: 'animals', difficulty: 3,
    slots: [
      { shape: 'parallelogram', cx: 110, cy: 100, rotation: 90 },             // left ear
      { shape: 'parallelogram', cx: 170, cy: 100, rotation: 90, flip: true }, // right ear
      { shape: 'square', cx: 140, cy: 160, rotation: 0 },           // head
      { shape: 'largeTriangle', cx: 160, cy: 220, rotation: 90 },   // body
      { shape: 'smallTriangle', cx: 140, cy: 200, rotation: 270 },  // front paws
      { shape: 'square', cx: 140, cy: 240, rotation: 0 },           // haunch
      { shape: 'smallTriangle', cx: 220, cy: 240, rotation: 270 },  // tail
    ],
  },
];

export function getPuzzleById(id) {
  return PUZZLES.find((p) => p.id === id);
}

export function getNextPuzzle(id) {
  const index = PUZZLES.findIndex((p) => p.id === id);
  if (index === -1) return null;
  return PUZZLES[(index + 1) % PUZZLES.length];
}

export function getPuzzlesBySection(section) {
  return PUZZLES.filter((p) => p.section === section);
}
