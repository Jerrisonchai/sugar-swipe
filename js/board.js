/* board.js — Grid model, candy generation, swap logic for Sugar Swipe */

window._SS = window._SS || {};

const Board = {
  grid: [],       // 2D array: grid[row][col] = { type, special }
  rows: 8,
  cols: 8,
  selectedCell: null,  // { row, col } or null

  /* ---- Init ---- */
  init(rows, cols) {
    this.rows = rows || 8;
    this.cols = cols || 8;
    this.selectedCell = null;
    this.generate();
  },

  /* ---- Generate board with no initial matches ---- */
  generate() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
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

  /* Check if placing `type` at (r,c) would create a match */
  wouldMatch(r, c, type) {
    // Check horizontal: 2 to the left
    if (c >= 2 &&
        this.grid[r][c-1]?.type === type &&
        this.grid[r][c-2]?.type === type) return true;
    // Check vertical: 2 above
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

  /* ---- Remove matched cells (set to null) ---- */
  removeCells(cells) {
    for (const { r, c } of cells) {
      this.set(r, c, null);
    }
  },

  /* ---- Get all positions in a column (r increasing = top to bottom) ---- */
  getColumn(c) {
    const col = [];
    for (let r = 0; r < this.rows; r++) {
      col.push({ r, c, candy: this.get(r, c) });
    }
    return col;
  },

  /* ---- Clear selection ---- */
  clearSelection() {
    this.selectedCell = null;
  },

  /* ---- Swap two specified cells and return resulting grid positions ---- */
  getSwapPositions(r1, c1, r2, c2) {
    return [
      { row: r1, col: c1, candy: this.get(r1, c1) },
      { row: r2, col: c2, candy: this.get(r2, c2) },
    ];
  },
};

window._SS.Board = Board;
