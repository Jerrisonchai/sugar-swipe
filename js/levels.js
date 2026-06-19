/* levels.js — Level definitions & loader for Sugar Swipe
   Phase 1: 5 test levels, Score Rush type only */

window._SS = window._SS || {};

const CANDY_TYPES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

/* Level definitions — Phase 1: 5 Score Rush levels */
const LEVELS = [
  {
    id: 1,
    world: 1,
    worldName: 'Candy Meadow',
    type: 'score',
    rows: 8,
    cols: 8,
    moves: 30,
    target1Star: 1500,
    target2Star: 3000,
    target3Star: 5000,
  },
  {
    id: 2,
    world: 1,
    worldName: 'Candy Meadow',
    type: 'score',
    rows: 8,
    cols: 8,
    moves: 28,
    target1Star: 2000,
    target2Star: 4000,
    target3Star: 6000,
  },
  {
    id: 3,
    world: 1,
    worldName: 'Candy Meadow',
    type: 'score',
    rows: 8,
    cols: 8,
    moves: 25,
    target1Star: 2500,
    target2Star: 5000,
    target3Star: 7500,
  },
  {
    id: 4,
    world: 1,
    worldName: 'Candy Meadow',
    type: 'score',
    rows: 8,
    cols: 8,
    moves: 25,
    target1Star: 3000,
    target2Star: 6000,
    target3Star: 9000,
  },
  {
    id: 5,
    world: 1,
    worldName: 'Candy Meadow',
    type: 'score',
    rows: 8,
    cols: 8,
    moves: 22,
    target1Star: 3500,
    target2Star: 7000,
    target3Star: 10000,
  },
];

const Levels = {
  getAll() { return LEVELS; },

  getById(id) { return LEVELS.find(l => l.id === id) || LEVELS[0]; },

  getFirstInWorld(world) {
    return LEVELS.find(l => l.world === world) || LEVELS[0];
  },

  getNextLevel(currentId) {
    const idx = LEVELS.findIndex(l => l.id === currentId);
    if (idx === -1 || idx >= LEVELS.length - 1) return null;
    return LEVELS[idx + 1];
  },

  isLastLevel(id) {
    return id >= LEVELS[LEVELS.length - 1].id;
  },

  totalLevels() { return LEVELS.length; },
};

window._SS.Levels = Levels;
window._SS.CANDY_TYPES = CANDY_TYPES;
