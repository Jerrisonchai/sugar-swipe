/* obstacles.js — Obstacle placement, adjacency damage, destruction — Phase 4 */

window._SS = window._SS || {};

const Obstacles = {

  /** Place obstacles from level data onto the board */
  placeAll(board, obstacleData) {
    for (const obs of obstacleData) {
      board.placeObstacle(obs.row, obs.col, obs.type, obs.layers);
    }
  },

  /** After a match clears cells, damage obstacles adjacent to each matched cell.
   *  Returns array of { row, col } that were destroyed (layers reached 0). */
  damageFromMatches(board, matchedCells) {
    const destroyed = [];
    const seen = new Set();
    for (const { r, c } of matchedCells) {
      const result = board.damageAdjacent(r, c);
      for (const d of result) {
        const key = `${d.row},${d.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          destroyed.push(d);
        }
      }
    }
    return destroyed;
  },

  /** Clear jelly from all matched cells on the board */
  clearJellyFromMatches(board, matchedCells) {
    let cleared = 0;
    for (const { r, c } of matchedCells) {
      if (board.hasJelly(r, c)) {
        if (board.clearJelly(r, c)) cleared++;
      }
    }
    return cleared;
  },

  /** Check if a cell is blocked (can't be selected/swapped) */
  isBlocked(board, r, c) {
    return board.hasObstacle(r, c);
  },
};

window._SS.Obstacles = Obstacles;
