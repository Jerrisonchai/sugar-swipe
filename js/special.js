/* special.js — Special candy creation, activation, and effects for Sugar Swipe */

window._SS = window._SS || {};

const Specials = {

  /* Determine what specials to create from match groups.
     Returns: [{ row, col, type }] where type is 'striped-h','striped-v','wrapped','bomb' */
  detectCreations(matchGroups) {
    const specials = [];
    const consumed = new Set();

    // Check for L/T shapes — intersecting horizontal + vertical groups of same color
    const hGroups = matchGroups.filter(g => this._isHorizontal(g.cells));
    const vGroups = matchGroups.filter(g => this._isVertical(g.cells));

    for (let hi = 0; hi < hGroups.length; hi++) {
      for (let vi = 0; vi < vGroups.length; vi++) {
        if (consumed.has(hi) || consumed.has(hGroups.length + vi)) continue;
        if (hGroups[hi].type !== vGroups[vi].type) continue;

        const overlap = this._getOverlap(hGroups[hi].cells, vGroups[vi].cells);
        if (overlap) {
          specials.push({ row: overlap.r, col: overlap.c, type: 'bomb' });
          consumed.add(hi);
          consumed.add(hGroups.length + vi);
        }
      }
    }

    // Process individual groups for striped (4) and bomb (5+)
    matchGroups.forEach((group, idx) => {
      if (consumed.has(idx)) return;
      const len = group.cells.length;
      if (len >= 5) {
        const mid = group.cells[Math.floor(len / 2)];
        specials.push({ row: mid.r, col: mid.c, type: 'bomb' });
      } else if (len === 4) {
        const mid = group.cells[1];
        if (this._isHorizontal(group.cells)) {
          specials.push({ row: mid.r, col: mid.c, type: 'striped-h' });
        } else {
          specials.push({ row: mid.r, col: mid.c, type: 'striped-v' });
        }
      }
    });

    return specials;
  },

  /* Activate a special candy at (row, col) — returns cells to remove */
  activate(board, candy, row, col, targetCell) {
    const cells = [];
    switch (candy.special) {
      case 'striped-h':
        for (let c = 0; c < board.cols; c++) {
          cells.push({ r: row, c });
        }
        break;
      case 'striped-v':
        for (let r = 0; r < board.rows; r++) {
          cells.push({ r, c: col });
        }
        break;
      case 'wrapped':
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            cells.push({ r: row + dr, c: col + dc });
          }
        }
        break;
      case 'bomb':
        // If swapped with a regular candy, clear all of that color
        // If chain-matched, clear most common color on board
        const targetColor = targetCell
          ? targetCell.type
          : this._mostCommonColor(board);
        for (let r = 0; r < board.rows; r++) {
          for (let c = 0; c < board.cols; c++) {
            const cell = board.get(r, c);
            if (cell && cell.type === targetColor) {
              cells.push({ r, c });
            }
          }
        }
        break;
    }
    // Filter to valid board positions that have candy
    return cells.filter(({ r, c }) =>
      r >= 0 && r < board.rows && c >= 0 && c < board.cols && board.get(r, c) !== null
    );
  },

  /* Check if a matched cell group contains any special candies */
  findActivatedSpecials(board, cells) {
    const activations = [];
    for (const { r, c } of cells) {
      const candy = board.get(r, c);
      if (candy && candy.special) {
        activations.push({ row: r, col: c, candy });
      }
    }
    return activations;
  },

  /* ---- Internals ---- */

  _isHorizontal(cells) {
    if (cells.length < 2) return true;
    const r0 = cells[0].r;
    return cells.every(c => c.r === r0);
  },

  _isVertical(cells) {
    if (cells.length < 2) return true;
    const c0 = cells[0].c;
    return cells.every(c => c.c === c0);
  },

  _getOverlap(cellsA, cellsB) {
    for (const a of cellsA) {
      for (const b of cellsB) {
        if (a.r === b.r && a.c === b.c) return a;
      }
    }
    return null;
  },

  _mostCommonColor(board) {
    const counts = {};
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const candy = board.get(r, c);
        if (candy && !candy.special) {
          counts[candy.type] = (counts[candy.type] || 0) + 1;
        }
      }
    }
    let max = 0, best = null;
    for (const [type, count] of Object.entries(counts)) {
      if (count > max) { max = count; best = type; }
    }
    return best;
  },
};

window._SS.Specials = Specials;
