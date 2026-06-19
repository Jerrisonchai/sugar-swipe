/* board.js — Grid model, candy generation, obstacles, jelly — Phase 4 */

window._SS = window._SS || {};

const Board = {
  grid: [],       // 2D: grid[row][col] = { type, special } | null
  obstacles: [],  // 2D: obstacles[row][col] = null | { type: 'ice', layers: N }
  jelly: [],      // 2D: jelly[row][col] = true | false
  rows: 8,
  cols: 8,
  selectedCell: null,

  /* ---- Init ---- */
  init(rows, cols) {
    this.rows = rows || 8;
    this.cols = cols || 8;
    this.selectedCell = null;
    this._initArrays();
    this.generate();
  },

  _initArrays() {
    this.grid = [];
    this.obstacles = [];
    this.jelly = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      this.obstacles[r] = [];
      this.jelly[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = null;
        this.obstacles[r][c] = null;
        this.jelly[r][c] = false;
      }
    }
  },

  /* ---- Generate board avoiding initial matches ---- */
  generate() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // Skip obstacle cells — they get candy too, but generated normally
        let type;
        do {
          type = this.randomType();
        } while (this.wouldMatch(r, c, type));
        this.grid[r][c] = { type, special: null };
      }
    }
  },

  randomType() {
    return CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
  },

  wouldMatch(r, c, type) {
    if (c >= 2 &&
        this.grid[r][c-1]?.type === type &&
        this.grid[r][c-2]?.type === type) return true;
    if (r >= 2 &&
        this.grid[r-1]?.[c]?.type === type &&
        this.grid[r-2]?.[c]?.type === type) return true;
    return false;
  },

  /* ---- Accessors ---- */
  get(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return this.grid[r][c];
  },

  set(r, c, candy) {
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
      this.grid[r][c] = candy;
    }
  },

  isEmpty(r, c) {
    return this.get(r, c) === null;
  },

  isInBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  },

  /* ---- Obstacles ---- */
  hasObstacle(r, c) {
    return this.isInBounds(r, c) && !!this.obstacles[r][c];
  },

  getObstacle(r, c) {
    if (!this.isInBounds(r, c)) return null;
    return this.obstacles[r][c];
  },

  placeObstacle(r, c, type, layers) {
    if (this.isInBounds(r, c)) {
      this.obstacles[r][c] = { type, layers };
    }
  },

  damageObstacle(r, c) {
    if (!this.hasObstacle(r, c)) return false;
    this.obstacles[r][c].layers--;
    if (this.obstacles[r][c].layers <= 0) {
      this.obstacles[r][c] = null;
      return true; // destroyed
    }
    return false; // still standing
  },

  /** Damage obstacles on ALL cells ADJACENT to the given position */
  damageAdjacent(r, c) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const destroyed = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (this.hasObstacle(nr, nc)) {
        if (this.damageObstacle(nr, nc)) {
          destroyed.push({ row: nr, col: nc });
        }
      }
    }
    return destroyed;
  },

  /* ---- Jelly ---- */
  hasJelly(r, c) {
    return this.isInBounds(r, c) && this.jelly[r][c];
  },

  clearJelly(r, c) {
    if (!this.isInBounds(r, c)) return false;
    const was = this.jelly[r][c];
    this.jelly[r][c] = false;
    return was;
  },

  /** Set jelly cells from level data */
  setJellyCells(jellyData) {
    for (const { row, col } of jellyData) {
      if (this.isInBounds(row, col)) this.jelly[row][col] = true;
    }
  },

  /** Count remaining jelly cells */
  jellyRemaining() {
    let count = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.jelly[r][c]) count++;
    return count;
  },

  /* ---- Swap ---- */
  areAdjacent(r1, c1, r2, c2) {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  },

  swap(r1, c1, r2, c2) {
    const a = this.get(r1, c1);
    const b = this.get(r2, c2);
    this.set(r1, c1, b);
    this.set(r2, c2, a);
  },

  /* ---- Remove matched cells ---- */
  removeCells(cells) {
    for (const { r, c } of cells) {
      this.set(r, c, null);
    }
  },

  getColumn(c) {
    const col = [];
    for (let r = 0; r < this.rows; r++) {
      col.push({ r, c, candy: this.get(r, c) });
    }
    return col;
  },

  clearSelection() {
    this.selectedCell = null;
  },

  getSwapPositions(r1, c1, r2, c2) {
    return [
      { row: r1, col: c1, candy: this.get(r1, c1) },
      { row: r2, col: c2, candy: this.get(r2, c2) },
    ];
  },
};

window._SS.Board = Board;
