/* levels.js — Level definitions, loader from JSON, board setup — Phase 4 */

window._SS = window._SS || {};

const CANDY_TYPES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

const Levels = {
  _data: null,

  /** Load levels from JSON (returns Promise) */
  async load() {
    if (this._data) return this._data;
    try {
      const resp = await fetch('data/levels.json?v=7');
      this._data = await resp.json();
    } catch (e) {
      // Fallback to inline levels if fetch fails (offline/APK)
      this._data = _LEVELS_FALLBACK;
    }
    return this._data;
  },

  getAll() { return this._data || _LEVELS_FALLBACK; },
  getById(id) { return this.getAll().find(l => l.id === id) || this.getAll()[0]; },
  getFirstInWorld(world) { return this.getAll().find(l => l.world === world) || this.getAll()[0]; },
  getNextLevel(currentId) {
    const all = this.getAll();
    const idx = all.findIndex(l => l.id === currentId);
    if (idx === -1 || idx >= all.length - 1) return null;
    return all[idx + 1];
  },
  isLastLevel(id) { return id >= this.getAll()[this.getAll().length - 1].id; },
  totalLevels() { return this.getAll().length; },
};

/* Compact fallback for offline/APK use */
const _LEVELS_FALLBACK = [
  {"id":1,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":30,"target1Star":1000,"target2Star":2200,"target3Star":3800,"obstacles":[],"jelly":[]},
  {"id":2,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":28,"target1Star":1500,"target2Star":3000,"target3Star":5000,"obstacles":[],"jelly":[]},
  {"id":3,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":26,"target1Star":2000,"target2Star":4000,"target3Star":6500,"obstacles":[],"jelly":[]},
  {"id":4,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":25,"target1Star":2500,"target2Star":5000,"target3Star":8000,"obstacles":[],"jelly":[]},
  {"id":5,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":22,"target1Star":3000,"target2Star":6000,"target3Star":9500,"obstacles":[],"jelly":[]},
  {"id":6,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":30,"target1Star":3500,"target2Star":7000,"target3Star":11000,"obstacles":[],"jelly":[]},
  {"id":7,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":28,"target1Star":4000,"target2Star":8000,"target3Star":12500,"obstacles":[],"jelly":[]},
  {"id":8,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":26,"target1Star":5000,"target2Star":10000,"target3Star":14000,"obstacles":[],"jelly":[]},
  {"id":9,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":25,"target1Star":6000,"target2Star":11000,"target3Star":16000,"obstacles":[],"jelly":[]},
  {"id":10,"world":1,"worldName":"Candy Meadow","type":"score","rows":8,"cols":8,"moves":22,"target1Star":7000,"target2Star":12000,"target3Star":18000,"obstacles":[],"jelly":[]},
  {"id":11,"world":2,"worldName":"Frosted Peaks","type":"score","rows":8,"cols":8,"moves":28,"target1Star":2500,"target2Star":4500,"target3Star":7000,"obstacles":[{"row":0,"col":0,"type":"ice","layers":1},{"row":0,"col":7,"type":"ice","layers":1},{"row":7,"col":0,"type":"ice","layers":1},{"row":7,"col":7,"type":"ice","layers":1}],"jelly":[]},
  {"id":12,"world":2,"worldName":"Frosted Peaks","type":"score","rows":8,"cols":8,"moves":26,"target1Star":3000,"target2Star":5500,"target3Star":8500,"obstacles":[{"row":1,"col":1,"type":"ice","layers":1},{"row":1,"col":6,"type":"ice","layers":1},{"row":3,"col":3,"type":"ice","layers":1},{"row":3,"col":4,"type":"ice","layers":1},{"row":4,"col":3,"type":"ice","layers":1},{"row":4,"col":4,"type":"ice","layers":1},{"row":6,"col":1,"type":"ice","layers":1},{"row":6,"col":6,"type":"ice","layers":1}],"jelly":[]},
];

window._SS.Levels = Levels;
window._SS.CANDY_TYPES = CANDY_TYPES;
