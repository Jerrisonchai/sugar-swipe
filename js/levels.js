/* levels.js — Level definitions & loader for Sugar Swipe
   Phase 2: 10 levels, Score Rush type */

window._SS = window._SS || {};

const CANDY_TYPES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

const LEVELS = [
  // Phase 1 levels (1-5)
  { id: 1, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 30, target1Star: 1000, target2Star: 2200, target3Star: 3800 },
  { id: 2, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 28, target1Star: 1500, target2Star: 3000, target3Star: 5000 },
  { id: 3, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 26, target1Star: 2000, target2Star: 4000, target3Star: 6500 },
  { id: 4, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 25, target1Star: 2500, target2Star: 5000, target3Star: 8000 },
  { id: 5, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 22, target1Star: 3000, target2Star: 6000, target3Star: 9500 },

  // Phase 2 levels (6-10)
  { id: 6, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 30, target1Star: 3500, target2Star: 7000, target3Star: 11000 },
  { id: 7, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 28, target1Star: 4000, target2Star: 8000, target3Star: 12500 },
  { id: 8, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 26, target1Star: 5000, target2Star: 10000, target3Star: 14000 },
  { id: 9, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 25, target1Star: 6000, target2Star: 11000, target3Star: 16000 },
  { id: 10, world: 1, worldName: 'Candy Meadow', type: 'score', rows: 8, cols: 8, moves: 22, target1Star: 7000, target2Star: 12000, target3Star: 18000 },
];

const Levels = {
  getAll() { return LEVELS; },
  getById(id) { return LEVELS.find(l => l.id === id) || LEVELS[0]; },
  getFirstInWorld(world) { return LEVELS.find(l => l.world === world) || LEVELS[0]; },
  getNextLevel(currentId) {
    const idx = LEVELS.findIndex(l => l.id === currentId);
    if (idx === -1 || idx >= LEVELS.length - 1) return null;
    return LEVELS[idx + 1];
  },
  isLastLevel(id) { return id >= LEVELS[LEVELS.length - 1].id; },
  totalLevels() { return LEVELS.length; },
};

window._SS.Levels = Levels;
window._SS.CANDY_TYPES = CANDY_TYPES;
