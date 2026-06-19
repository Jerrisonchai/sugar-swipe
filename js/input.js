/* input.js — Touch/mouse handling for candy selection & swapping */

window._SS = window._SS || {};

const Input = {
  board: null,
  boardEl: null,
  enabled: true,
  _touchStart: null,

  /* ---- Init ---- */
  init(board, boardEl) {
    this.board = board;
    this.boardEl = boardEl;
    this._touchStart = null;
    this.enabled = true;

    boardEl.addEventListener('pointerdown', this._onPointerDown.bind(this));
    boardEl.addEventListener('pointerup', this._onPointerUp.bind(this));
    // Prevent scrolling while swiping on board
    boardEl.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  },

  enable()  { this.enabled = true; },
  disable() { this.enabled = false; this.board.clearSelection(); },

  /* ---- Cell from event ---- */
  _getCellFromEvent(e) {
    const rect = this.boardEl.getBoundingClientRect();
    const cellW = rect.width / this.board.cols;
    const cellH = rect.height / this.board.rows;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (row < 0 || row >= this.board.rows || col < 0 || col >= this.board.cols) {
      return null;
    }
    // Skip obstacle-blocked cells
    if (this.board.hasObstacle(row, col)) return null;
    return { row, col };
  },

  /* ---- Pointer events ---- */
  _onPointerDown(e) {
    if (!this.enabled) return;
    const cell = this._getCellFromEvent(e);
    if (!cell) return;
    this._touchStart = cell;

    const prev = this.board.selectedCell;

    if (prev && prev.row === cell.row && prev.col === cell.col) {
      // Tap same cell — deselect
      this.board.clearSelection();
      this._fireEvent('deselect', cell);
      return;
    }

    if (prev && this.board.areAdjacent(prev.row, prev.col, cell.row, cell.col)) {
      // Adjacent to selected → attempt swap
      this._fireEvent('swap', { from: prev, to: cell });
      this.board.clearSelection();
      return;
    }

    // Select new cell
    this.board.selectedCell = cell;
    this._fireEvent('select', cell);
  },

  _onPointerUp(e) {
    if (!this.enabled || !this._touchStart) return;
    const cell = this._getCellFromEvent(e);
    if (!cell) { this._touchStart = null; return; }

    const start = this._touchStart;
    this._touchStart = null;

    // If dragged to different cell
    if (start.row !== cell.row || start.col !== cell.col) {
      const dr = cell.row - start.row;
      const dc = cell.col - start.col;
      let toRow = start.row;
      let toCol = start.col;

      // Determine swipe direction (largest delta)
      if (Math.abs(dr) > Math.abs(dc)) {
        toRow = start.row + (dr > 0 ? 1 : -1);
      } else if (Math.abs(dc) > 0) {
        toCol = start.col + (dc > 0 ? 1 : -1);
      }

      if (this.board.areAdjacent(start.row, start.col, toRow, toCol)) {
        this._fireEvent('swap', { from: start, to: { row: toRow, col: toCol } });
        this.board.clearSelection();
        return;
      }
    }

    // If just a tap on a cell
    const prev = this.board.selectedCell;
    if (prev && prev.row === cell.row && prev.col === cell.col) {
      this.board.clearSelection();
      this._fireEvent('deselect', cell);
      return;
    }

    if (prev && this.board.areAdjacent(prev.row, prev.col, cell.row, cell.col)) {
      this._fireEvent('swap', { from: prev, to: cell });
      this.board.clearSelection();
      return;
    }

    // Select new cell (or first tap)
    this.board.selectedCell = cell;
    this._fireEvent('select', cell);
  },

  /* ---- Event system ---- */
  _listeners: {},

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },

  _fireEvent(event, data) {
    if (!this._listeners[event]) return;
    for (const fn of this._listeners[event]) {
      fn(data);
    }
  },
};

window._SS.Input = Input;
