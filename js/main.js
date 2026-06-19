/* main.js — Game loop & state machine for Sugar Swipe — Phase 1 */

window._SS = window._SS || {};

(function () {
  const { Board, MatchEngine, Cascade, Input, UI, Scoring, Levels, Storage } = window._SS;

  // ===== STATE =====
  const state = {
    level: null,
    score: 0,
    movesLeft: 0,
    chainIndex: 0,
    phase: 'IDLE', // IDLE | SWAPPING | MATCHING | CASCADING | COMPLETE | FAIL | PAUSED
  };

  // ===== GAME LOOP =====

  async function startLevel(levelId) {
    const level = Levels.getById(levelId);
    state.level = level;
    state.score = 0;
    state.movesLeft = level.moves;
    state.chainIndex = 0;
    state.phase = 'IDLE';

    Board.init(level.rows, level.cols);
    UI.renderBoard(Board);
    UI.updateHUD(level, state.score, state.movesLeft);
    UI.showGameScreen();
    Input.enable();

    // Check for existing matches on fresh board and clear them
    await clearInitialMatches();
  }

  async function clearInitialMatches() {
    let result = MatchEngine.findMatches(Board);
    while (result.hasMatch) {
      Board.removeCells(result.cells);
      Cascade.applyGravity(Board);
      result = MatchEngine.findMatches(Board);
    }
    UI.renderBoard(Board);
  }

  function setupInput() {
    Input.init(Board, document.getElementById('board'));

    Input.on('select', (cell) => {
      if (state.phase !== 'IDLE') return;
      UI.highlightCell(cell.row, cell.col);
    });

    Input.on('deselect', () => {
      if (state.phase !== 'IDLE') return;
      UI.clearHighlight();
    });

    Input.on('swap', (data) => {
      if (state.phase !== 'IDLE') return;
      handleSwap(data.from, data.to);
    });
  }

  // ===== SWAP HANDLER =====

  async function handleSwap(from, to) {
    state.phase = 'SWAPPING';
    Input.disable();
    UI.clearHighlight();

    // Animate the swap
    await new Promise(resolve => {
      UI.animateSwap(from.row, from.col, to.row, to.col, resolve);
    });

    // Check if swap produces a match
    const hasMatch = MatchEngine.wouldSwapMatch(Board, from.row, from.col, to.row, to.col);

    if (!hasMatch) {
      // Invalid swap — swap back
      await new Promise(resolve => {
        UI.animateSwap(from.row, from.col, to.row, to.col, resolve);
      });
      UI.shakeBoard();
      state.phase = 'IDLE';
      Input.enable();
      return;
    }

    // Valid swap — swap is already done (wouldSwapMatch swaps then swaps back)
    Board.swap(from.row, from.col, to.row, to.col);
    UI.renderBoard(Board);

    // Process all matches & cascades
    state.chainIndex = 0;
    await processMatches();

    // Decrement moves
    state.movesLeft--;
    UI.updateHUD(state.level, state.score, state.movesLeft);

    // Check win/lose
    await checkEndCondition();
  }

  // ===== MATCH + CASCADE LOOP =====

  async function processMatches() {
    let result = MatchEngine.findMatches(Board);

    while (result.hasMatch) {
      // Calculate and add points
      const points = Scoring.calcChainPoints(result.groups, state.chainIndex);
      state.score += points;
      UI.updateHUD(state.level, state.score, state.movesLeft);

      // Show combo text
      const comboText = Scoring.comboName(state.chainIndex);
      if (comboText) UI.showCombo(comboText);

      // Animate match removal
      state.phase = 'MATCHING';
      await UI.animateMatches(result.cells);

      // Remove matched cells from model
      Board.removeCells(result.cells);

      // Apply gravity + fill
      state.phase = 'CASCADING';
      const { drops, spawns } = Cascade.applyGravity(Board);
      UI.animateCascade(drops, spawns);

      // Wait for cascade animation to finish
      await UI._sleep(450);

      // Re-check for chain matches
      state.chainIndex++;
      result = MatchEngine.findMatches(Board);
    }

    // Check for stalemate (no valid moves)
    if (state.movesLeft > 0) {
      const validMove = MatchEngine.findValidMove(Board);
      if (!validMove) {
        // Shuffle board
        await reshuffleBoard();
      }
    }
  }

  async function reshuffleBoard() {
    UI.showCombo('No moves! Reshuffling...');
    await UI._sleep(600);
    Board.generate();
    // Clear any matches on new board
    await clearInitialMatches();
  }

  // ===== END CONDITIONS =====

  async function checkEndCondition() {
    if (state.score >= state.level.target1Star) {
      // Level complete
      const stars = Scoring.calcStars(
        state.score,
        state.level.target1Star,
        state.level.target2Star,
        state.level.target3Star
      );
      state.phase = 'COMPLETE';

      // Save progress
      Storage.setLevelStars(state.level.id, stars);
      Storage.setHighScore(state.level.id, state.score);

      await UI._sleep(400);
      UI.showLevelComplete(stars, state.score);
    } else if (state.movesLeft <= 0) {
      // Out of moves — fail
      state.phase = 'FAIL';
      await UI._sleep(400);
      UI.showLevelFail(state.score);
    } else {
      // Continue playing
      state.phase = 'IDLE';
      Input.enable();
    }
  }

  // ===== SCREEN BUTTONS =====

  function setupButtons() {
    // Level complete
    document.getElementById('btn-next-level').addEventListener('click', () => {
      const next = Levels.getNextLevel(state.level.id);
      if (next) {
        startLevel(next.id);
      }
    });

    document.getElementById('btn-replay-win').addEventListener('click', () => {
      startLevel(state.level.id);
    });

    document.getElementById('btn-map-win').addEventListener('click', () => {
      startLevel(1); // Phase 1: go to level 1 (no world map yet)
    });

    // Level fail
    document.getElementById('btn-retry').addEventListener('click', () => {
      startLevel(state.level.id);
    });

    document.getElementById('btn-map-fail').addEventListener('click', () => {
      startLevel(1);
    });

    // Pause
    document.getElementById('btn-pause').addEventListener('click', () => {
      if (state.phase === 'PAUSED') return;
      state.phase = 'PAUSED';
      Input.disable();
      UI.showPause();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      state.phase = 'IDLE';
      UI.hidePause();
      Input.enable();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      UI.hidePause();
      startLevel(state.level.id);
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
      UI.hidePause();
      startLevel(1);
    });
  }

  // ===== INIT =====
  function init() {
    setupInput();
    setupButtons();
    startLevel(1);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
