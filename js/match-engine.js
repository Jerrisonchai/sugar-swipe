/* match-engine.js — Scans board for 3+ matches in Sugar Swipe */

window._SS = window._SS || {};

const MatchEngine = {

  /* Return array of match groups: [{ type, cells: [{r,c},...] }, ...] */
  findMatches(board) {
    const matched = new Set(); // "r,c" strings of all matched positions
    const groups = [];

    // Scan horizontal (rows)
    for (let r = 0; r < board.rows; r++) {
      let runStart = 0;
      for (let c = 1; c <= board.cols; c++) {
        const curr = board.get(r, c);
        const prev = board.get(r, c - 1);

        if (c < board.cols && curr && prev && curr.type === prev.type) {
          continue; // same type, extend run
        }

        // Run ended (or end of row)
        const runLen = c - runStart;
        if (runLen >= 3) {
          const cells = [];
          for (let i = runStart; i < c; i++) {
            cells.push({ r, c: i });
            matched.add(`${r},${i}`);
          }
          groups.push({ type: board.get(r, runStart).type, cells });
        }
        runStart = c;
      }
    }

    // Scan vertical (columns)
    for (let c = 0; c < board.cols; c++) {
      let runStart = 0;
      for (let r = 1; r <= board.rows; r++) {
        const curr = board.get(r, c);
        const prev = board.get(r - 1, c);

        if (r < board.rows && curr && prev && curr.type === prev.type) {
          continue;
        }

        const runLen = r - runStart;
        if (runLen >= 3) {
          const cells = [];
          for (let i = runStart; i < r; i++) {
            cells.push({ r: i, c });
            matched.add(`${i},${c}`);
          }
          groups.push({ type: board.get(runStart, c).type, cells });
        }
        runStart = r;
      }
    }

    // Deduplicate: merge overlapping groups, build unique set of cells
    const uniqueCells = [];
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number);
      uniqueCells.push({ r, c });
    }

    return { groups, cells: uniqueCells, hasMatch: uniqueCells.length > 0 };
  },

  /* Check if a specific swap would produce a match */
  wouldSwapMatch(board, r1, c1, r2, c2) {
    board.swap(r1, c1, r2, c2);
    const result = this.findMatches(board);
    board.swap(r1, c1, r2, c2); // swap back
    return result.hasMatch;
  },

  /* Find any valid move on the board (for hint / stalemate check) */
  findValidMove(board) {
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        // Try right
        if (c + 1 < board.cols && this.wouldSwapMatch(board, r, c, r, c + 1)) {
          return { r1: r, c1: c, r2: r, c2: c + 1 };
        }
        // Try down
        if (r + 1 < board.rows && this.wouldSwapMatch(board, r, c, r + 1, c)) {
          return { r1: r, c1: c, r2: r + 1, c2: c };
        }
      }
    }
    return null; // No valid moves — stalemate
  },
};

window._SS.MatchEngine = MatchEngine;
