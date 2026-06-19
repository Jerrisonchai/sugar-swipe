/* cascade.js — Gravity, fill, and chain detection for Sugar Swipe */

window._SS = window._SS || {};

const Cascade = {

  /* Apply gravity to a single column after matches:
     Returns { drops: [{fromR, toR, c, candy}, ...], spawns: [{r, c, candy}, ...] } */
  applyGravity(board) {
    const drops = [];
    const spawns = [];

    for (let c = 0; c < board.cols; c++) {
      // Compact non-null cells to bottom of column
      let writeRow = board.rows - 1;

      for (let r = board.rows - 1; r >= 0; r--) {
        const candy = board.get(r, c);
        if (candy !== null) {
          if (r !== writeRow) {
            // This candy needs to fall
            drops.push({ fromR: r, fromC: c, toR: writeRow, toC: c, candy });
            board.set(writeRow, c, candy);
            board.set(r, c, null);
          }
          writeRow--;
        }
      }

      // Fill empty cells at top with new candies
      for (let r = writeRow; r >= 0; r--) {
        const newCandy = { type: board.randomType(), special: null };
        board.set(r, c, newCandy);
        spawns.push({ row: r, col: c, candy: newCandy });
      }
    }

    return { drops, spawns };
  },

  /* Collect all drops/spawns by group for animation */
  groupByColumn(drops) {
    const cols = {};
    for (const d of drops) {
      if (!cols[d.toC]) cols[d.toC] = [];
      cols[d.toC].push(d);
    }
    // Sort each column top to bottom (r increasing)
    for (const c in cols) {
      cols[c].sort((a, b) => a.toR - b.toR);
    }
    return cols;
  },
};

window._SS.Cascade = Cascade;
