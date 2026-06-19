/* main.js — Game loop & state machine for Sugar Swipe — Phase 2 */

window._SS = window._SS || {};

(function () {
  const { Board, MatchEngine, Cascade, Input, UI, Scoring, Levels, Storage, Specials } = window._SS;

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

  // ===== INPUT SETUP =====

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
    const candyA = Board.get(from.row, from.col);
    const candyB = Board.get(to.row, to.col);
    if (!candyA || !candyB) return;

    state.phase = 'SWAPPING';
    Input.disable();
    UI.clearHighlight();

    // --- SPECIAL SWAP: Bomb + Regular candy ---
    if ((candyA.special === 'bomb' && !candyB.special) ||
        (candyB.special === 'bomb' && !candyA.special)) {
      await handleBombSwap(from, to, candyA, candyB);
      return;
    }

    // Animate swap
    await swapAnimate(from, to);

    // Check match
    const hasMatch = MatchEngine.wouldSwapMatch(Board, from.row, from.col, to.row, to.col);

    if (!hasMatch) {
      // Invalid swap — undo
      await swapAnimate(from, to);
      UI.shakeBoard();
      state.phase = 'IDLE';
      Input.enable();
      return;
    }

    // Commit swap
    Board.swap(from.row, from.col, to.row, to.col);
    UI.renderBoard(Board);

    // Process all matches, specials & cascades
    state.chainIndex = 0;
    await processMatchLoop();

    state.movesLeft--;
    UI.updateHUD(state.level, state.score, state.movesLeft);
    await checkEndCondition();
  }

  // ===== BOMB SWAP =====

  async function handleBombSwap(from, to, candyA, candyB) {
    const bombPos = candyA.special === 'bomb' ? from : to;
    const targetCandy = candyA.special === 'bomb' ? candyB : candyA;

    await swapAnimate(from, to);

    // Activate bomb: clears all candies of target color
    const effectCells = Specials.activate(Board, { special: 'bomb' }, bombPos.row, bombPos.col, targetCandy);

    // Merge bomb position and effect cells, deduplicate
    const uniq = dedupeCells([...effectCells, { r: bombPos.row, c: bombPos.col }]);

    // Score the mass clear
    const points = uniq.length * 35;
    state.score += points;
    UI.updateHUD(state.level, state.score, state.movesLeft);
    UI.showCombo('Color Bomb!');

    // Animate and remove
    state.phase = 'MATCHING';
    await UI.animateMatches(uniq);
    Board.removeCells(uniq);

    // Cascade
    state.phase = 'CASCADING';
    const { drops, spawns } = Cascade.applyGravity(Board);
    UI.animateCascade(drops, spawns);
    await UI._sleep(450);

    // Process chain reactions
    state.chainIndex = 1;
    await processMatchLoop();

    state.movesLeft--;
    UI.updateHUD(state.level, state.score, state.movesLeft);
    await checkEndCondition();
  }

  // ===== MATCH LOOP (with special candy creation & activation) =====

  async function processMatchLoop() {
    let result = MatchEngine.findMatches(Board);

    while (result.hasMatch) {
      // 1. Detect specials to CREATE from match groups
      const newSpecials = Specials.detectCreations(result.groups);

      // 2. Check for existing specials IN the matched cells (to activate)
      const activated = Specials.findActivatedSpecials(Board, result.cells);

      // 3. Expand removal set with activation effects
      let expandedCells = [...result.cells];
      for (const act of activated) {
        const effect = Specials.activate(Board, act.candy, act.row, act.col);
        expandedCells = expandedCells.concat(effect);
      }
      expandedCells = dedupeCells(expandedCells);

      // 4. Calculate and add points (base match points + extra for special clears)
      const basePoints = Scoring.calcChainPoints(result.groups, state.chainIndex);
      const bonusPoints = (expandedCells.length - result.cells.length) * 20;
      const points = basePoints + bonusPoints;
      state.score += points;
      UI.updateHUD(state.level, state.score, state.movesLeft);

      // Show combo
      const comboText = Scoring.comboName(state.chainIndex);
      if (comboText) UI.showCombo(comboText);

      // 5. Animate match removal
      state.phase = 'MATCHING';
      await UI.animateMatches(expandedCells);

      // 6. Remove all cells from model
      Board.removeCells(expandedCells);

      // 7. Place newly created specials on the board
      for (const sp of newSpecials) {
        Board.set(sp.row, sp.col, { type: CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)], special: sp.type });
      }

      // 8. Cascade
      state.phase = 'CASCADING';
      const { drops, spawns } = Cascade.applyGravity(Board);
      UI.animateCascade(drops, spawns);
      await UI._sleep(450);

      // 9. Re-check for chain matches
      state.chainIndex++;
      result = MatchEngine.findMatches(Board);
    }

    // Stalemate check
    if (state.movesLeft > 0 && state.phase !== 'COMPLETE' && state.phase !== 'FAIL') {
      const validMove = MatchEngine.findValidMove(Board);
      if (!validMove) {
        await reshuffleBoard();
      }
    }
  }

  // ===== UTILITY =====

  function dedupeCells(cells) {
    const seen = new Set();
    const uniq = [];
    for (const { r, c } of cells) {
      if (r < 0 || r >= Board.rows || c < 0 || c >= Board.cols) continue;
      const key = `${r},${c}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push({ r, c });
      }
    }
    return uniq;
  }

  function swapAnimate(from, to) {
    return new Promise(resolve => {
      UI.animateSwap(from.row, from.col, to.row, to.col, resolve);
    });
  }

  async function reshuffleBoard() {
    UI.showCombo('Reshuffling...');
    await UI._sleep(600);
    Board.generate();
    await clearInitialMatches();
  }

  // ===== END CONDITIONS =====

  async function checkEndCondition() {
    if (state.score >= state.level.target1Star) {
      const stars = Scoring.calcStars(
        state.score,
        state.movesLeft,
        state.level.moves,
        state.level.target1Star,
        state.level.target2Star,
        state.level.target3Star
      );
      state.phase = 'COMPLETE';
      Storage.setLevelStars(state.level.id, stars);
      Storage.setHighScore(state.level.id, state.score);

      await UI._sleep(400);
      UI.showLevelComplete(stars, state.score);
    } else if (state.movesLeft <= 0) {
      state.phase = 'FAIL';
      await UI._sleep(400);
      UI.showLevelFail(state.score);
    } else {
      state.phase = 'IDLE';
      Input.enable();
    }
  }

  // ===== SCREEN BUTTONS =====

  function setupButtons() {
    document.getElementById('btn-next-level').addEventListener('click', () => {
      const next = Levels.getNextLevel(state.level.id);
      if (next) startLevel(next.id);
    });

    document.getElementById('btn-replay-win').addEventListener('click', () => {
      startLevel(state.level.id);
    });

    document.getElementById('btn-map-win').addEventListener('click', () => {
      startLevel(1);
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      startLevel(state.level.id);
    });

    document.getElementById('btn-map-fail').addEventListener('click', () => {
      startLevel(1);
    });

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
