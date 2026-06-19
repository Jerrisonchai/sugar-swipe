/* main.js — Game loop, state machine, lives, boosters — Phase 6 */

window._SS = window._SS || {};

(function () {
  const { Board, MatchEngine, Cascade, Input, UI, Scoring, Levels, Storage, Specials, AudioFX, Obstacles } = window._SS;
  const CANDY_TYPES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

  // ===== STATE =====
  const state = {
    level: null,
    score: 0,
    movesLeft: 0,
    chainIndex: 0,
    jellyLeft: 0,
    phase: 'IDLE',
    hammerMode: false,    // true when hammer booster active
    extraMovesUsed: 0,    // count of extra moves purchased this level
    levelStarted: false,  // whether lives have been consumed for this attempt
  };

  // ===== GAME LOOP =====

  async function startLevel(levelId) {
    await Levels.load();
    const level = Levels.getById(levelId);
    if (!level) return;

    // Check lives
    const lives = Storage.getLives();
    if (lives <= 0) {
      showNoLives(levelId);
      return;
    }

    // Consume a life when starting a fresh attempt (not retry)
    if (!state.levelStarted) {
      Storage.consumeLife();
      state.levelStarted = true;
    }

    state.level = level;
    state.score = 0;
    state.movesLeft = level.moves;
    state.chainIndex = 0;
    state.phase = 'IDLE';
    state.hammerMode = false;
    state.extraMovesUsed = 0;
    state.levelStarted = true;

    Board.init(level.rows, level.cols);
    deactivateAllBoosters();

    if (level.obstacles && level.obstacles.length > 0) {
      Obstacles.placeAll(Board, level.obstacles);
    }
    if (level.jelly && level.jelly.length > 0) {
      Board.setJellyCells(level.jelly);
      state.jellyLeft = level.jelly.length;
    } else {
      state.jellyLeft = 0;
    }

    UI.renderBoard(Board);
    updateLivesDisplay();
    updateBoosterCounts();
    UI.updateHUD(level, state.score, state.movesLeft, state.jellyLeft);
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
      AudioFX.init();

      // Hammer mode: destroy cell immediately
      if (state.hammerMode) {
        useHammer(cell.row, cell.col);
        return;
      }

      AudioFX.select();
      UI.highlightCell(cell.row, cell.col);
    });

    Input.on('deselect', () => {
      if (state.phase !== 'IDLE' || state.hammerMode) return;
      UI.clearHighlight();
    });

    Input.on('swap', (data) => {
      if (state.phase !== 'IDLE' || state.hammerMode) return;
      handleSwap(data.from, data.to);
    });
  }

  // ===== HAMMER BOOSTER =====
  async function useHammer(r, c) {
    if (!state.hammerMode) return;
    state.hammerMode = false;
    deactivateAllBoosters();

    // Destroy cell contents: candy, obstacle, everything
    const cells = [{ r, c }];

    // Score a small amount
    state.score += 100;
    AudioFX.specialActivate();
    UI.showWrappedExplode(r, c); // reuse wrapped VFX for hammer
    state.phase = 'MATCHING';
    await UI.animateMatches(cells);
    Board.removeCells(cells);

    // Also destroy obstacle
    if (Board.hasObstacle(r, c)) {
      Board.damageObstacle(r, c);
      if (Board.hasObstacle(r, c)) {
        Board.damageObstacle(r, c); // second hit for 2-layer
      }
      UI.showIceBreak(r, c);
    }

    // Clear jelly if present
    if (Board.hasJelly(r, c)) {
      Board.clearJelly(r, c);
      if (state.jellyLeft > 0) state.jellyLeft--;
    }

    // Cascade
    state.phase = 'CASCADING';
    const { drops, spawns } = Cascade.applyGravity(Board);
    UI.animateCascade(drops, spawns);
    await UI._sleep(400);

    // Process chain reactions
    state.chainIndex = 0;
    await processMatchLoop();

    state.movesLeft--;
    updateLivesDisplay();
    updateBoosterCounts();
    UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);
    await checkEndCondition();
  }

  // ===== BOMB BOOSTER =====
  async function useBomb() {
    // Place a color bomb at a random cell that's not blocked
    const validCells = [];
    for (let r = 0; r < Board.rows; r++) {
      for (let c = 0; c < Board.cols; c++) {
        if (!Board.hasObstacle(r, c)) validCells.push({ r, c });
      }
    }
    if (validCells.length === 0) return;

    const pos = validCells[Math.floor(Math.random() * validCells.length)];
    Board.set(pos.r, pos.c, {
      type: CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)],
      special: 'bomb'
    });
    AudioFX.specialActivate();
    UI.showBombSweep('bomb');
    UI.renderBoard(Board);
    await UI._sleep(500);

    state.movesLeft--;
    updateBoosterCounts();
    UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);
    await checkEndCondition();
  }

  // ===== SWAP HANDLER =====
  async function handleSwap(from, to) {
    const candyA = Board.get(from.row, from.col);
    const candyB = Board.get(to.row, to.col);
    if (!candyA || !candyB) return;

    state.phase = 'SWAPPING';
    Input.disable();
    UI.clearHighlight();

    if ((candyA.special === 'bomb' && !candyB.special) ||
        (candyB.special === 'bomb' && !candyA.special)) {
      await handleBombSwap(from, to, candyA, candyB);
      return;
    }

    await swapAnimate(from, to);
    AudioFX.swap();

    const hasMatch = MatchEngine.wouldSwapMatch(Board, from.row, from.col, to.row, to.col);
    if (!hasMatch) {
      await swapAnimate(from, to);
      UI.shakeBoard();
      state.phase = 'IDLE';
      Input.enable();
      return;
    }

    Board.swap(from.row, from.col, to.row, to.col);
    UI.renderBoard(Board);

    state.chainIndex = 0;
    await processMatchLoop();

    state.movesLeft--;
    updateLivesDisplay();
    updateBoosterCounts();
    UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);
    await checkEndCondition();
  }

  async function handleBombSwap(from, to, candyA, candyB) {
    const bombPos = candyA.special === 'bomb' ? from : to;
    const targetCandy = candyA.special === 'bomb' ? candyB : candyA;
    await swapAnimate(from, to);
    AudioFX.specialActivate();
    UI.showBombSweep(targetCandy.type);
    const effectCells = Specials.activate(Board, { special: 'bomb' }, bombPos.row, bombPos.col, targetCandy);
    const uniq = dedupeCells([...effectCells, { r: bombPos.row, c: bombPos.col }]);
    const points = uniq.length * 35;
    state.score += points;
    UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);
    UI.showCombo('Color Bomb!');
    state.phase = 'MATCHING';
    await UI.animateMatches(uniq);
    Board.removeCells(uniq);
    state.phase = 'CASCADING';
    const { drops, spawns } = Cascade.applyGravity(Board);
    UI.animateCascade(drops, spawns);
    await UI._sleep(450);
    state.chainIndex = 1;
    await processMatchLoop();
    state.movesLeft--;
    updateLivesDisplay();
    updateBoosterCounts();
    UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);
    await checkEndCondition();
  }

  // ===== MATCH LOOP =====
  async function processMatchLoop() {
    let result = MatchEngine.findMatches(Board);
    while (result.hasMatch) {
      const newSpecials = Specials.detectCreations(result.groups);
      const activated = Specials.findActivatedSpecials(Board, result.cells);
      const maxGroupSize = Math.max(...result.groups.map(g => g.cells.length), 3);
      if (state.chainIndex === 0) {
        if (maxGroupSize >= 4 || newSpecials.length > 0) AudioFX.match4();
        else AudioFX.match3();
      } else {
        AudioFX.cascade();
      }

      let expandedCells = [...result.cells];
      for (const act of activated) {
        const effect = Specials.activate(Board, act.candy, act.row, act.col);
        expandedCells = expandedCells.concat(effect);
        AudioFX.specialActivate();
        switch (act.candy.special) {
          case 'striped-h': UI.showStripedFlash(act.row, act.col, true); break;
          case 'striped-v': UI.showStripedFlash(act.row, act.col, false); break;
          case 'wrapped': UI.showWrappedExplode(act.row, act.col); break;
          case 'bomb':
            const targetType = CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
            UI.showBombSweep(targetType);
            break;
        }
      }
      expandedCells = dedupeCells(expandedCells);

      const basePoints = Scoring.calcChainPoints(result.groups, state.chainIndex);
      const bonusPoints = (expandedCells.length - result.cells.length) * 20;
      state.score += basePoints + bonusPoints;
      UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);

      const comboText = Scoring.comboName(state.chainIndex);
      if (comboText) UI.showCombo(comboText);

      state.phase = 'MATCHING';
      await UI.animateMatches(expandedCells);
      Board.removeCells(expandedCells);

      const destroyed = Obstacles.damageFromMatches(Board, expandedCells);
      for (const d of destroyed) UI.showIceBreak(d.row, d.col);
      if (state.jellyLeft > 0) {
        const cleared = Obstacles.clearJellyFromMatches(Board, expandedCells);
        state.jellyLeft -= cleared;
      }
      UI.renderBoard(Board);

      for (const sp of newSpecials) {
        Board.set(sp.row, sp.col, {
          type: CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)],
          special: sp.type
        });
      }

      state.phase = 'CASCADING';
      const { drops, spawns } = Cascade.applyGravity(Board);
      UI.animateCascade(drops, spawns);
      await UI._sleep(450);

      state.chainIndex++;
      result = MatchEngine.findMatches(Board);
    }

    if (state.movesLeft > 0 && state.phase !== 'COMPLETE' && state.phase !== 'FAIL') {
      const validMove = MatchEngine.findValidMove(Board);
      if (!validMove) await reshuffleBoard();
    }
  }

  // ===== UTILITY =====
  function dedupeCells(cells) {
    const seen = new Set();
    const uniq = [];
    for (const { r, c } of cells) {
      if (r < 0 || r >= Board.rows || c < 0 || c >= Board.cols) continue;
      const key = `${r},${c}`;
      if (!seen.has(key)) { seen.add(key); uniq.push({ r, c }); }
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

  // ===== LIVES =====
  function updateLivesDisplay() {
    const lives = Storage.getLives();
    const el = document.getElementById('hud-lives');
    if (el) {
      el.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 5 - lives));
    }
  }

  function showNoLives(levelId) {
    UI.showScreen('no-lives');
    document.getElementById('btn-refill-lives').onclick = () => {
      AudioFX.buttonTap();
      if (Storage.spendCoins(100)) {
        Storage.set('lives', { lives: Storage.MAX_LIVES, lastRegenTime: Date.now() });
        document.getElementById('no-lives').classList.remove('active');
        state.levelStarted = false; // Allow life consume on next attempt
        startLevel(levelId);
      }
    };
    document.getElementById('btn-wait-lives').onclick = () => {
      AudioFX.buttonTap();
      document.getElementById('no-lives').classList.remove('active');
      state.levelStarted = false;
      UI.showWorldMap();
    };
    startLivesTimer(levelId);
  }

  function startLivesTimer(levelId) {
    const el = document.getElementById('lives-timer');
    function tick() {
      const sec = Storage.secondsUntilNextLife();
      if (sec <= 0) {
        el.textContent = 'Tap to play!';
        if (document.getElementById('no-lives') && document.getElementById('no-lives').classList.contains('active')) {
          document.getElementById('no-lives').classList.remove('active');
          state.levelStarted = false;
          startLevel(levelId);
        }
        return;
      }
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      el.textContent = `Next life in ${m}:${s.toString().padStart(2, '0')}`;
      setTimeout(tick, 1000);
    }
    tick();
  }

  // ===== BOOSTERS =====
  function updateBoosterCounts() {
    const countMoves = document.getElementById('count-moves');
    const countHammer = document.getElementById('count-hammer');
    const countBomb = document.getElementById('count-bomb');
    if (countMoves) countMoves.textContent = Storage.getBoosterCount('moves');
    if (countHammer) countHammer.textContent = Storage.getBoosterCount('hammer');
    if (countBomb) countBomb.textContent = Storage.getBoosterCount('bomb');

    // Disable buttons with 0 count
    const btnMoves = document.getElementById('booster-moves');
    const btnHammer = document.getElementById('booster-hammer');
    const btnBomb = document.getElementById('booster-bomb');
    [btnMoves, btnHammer, btnBomb].forEach(b => { if (b) b.classList.remove('disabled'); });
    if (btnMoves && Storage.getBoosterCount('moves') <= 0) btnMoves.classList.add('disabled');
    if (btnHammer && Storage.getBoosterCount('hammer') <= 0) btnHammer.classList.add('disabled');
    if (btnBomb && Storage.getBoosterCount('bomb') <= 0) btnBomb.classList.add('disabled');
  }

  function deactivateAllBoosters() {
    const btnHammer = document.getElementById('booster-hammer');
    const btnBomb = document.getElementById('booster-bomb');
    if (btnHammer) btnHammer.classList.remove('active');
    if (btnBomb) btnBomb.classList.remove('active');
    state.hammerMode = false;
  }

  // ===== END CONDITIONS =====
  async function checkEndCondition() {
    const isJellyLevel = state.level.type === 'jelly';
    const jellyCleared = isJellyLevel && state.jellyLeft === 0;
    const scoreMet = state.score >= state.level.target1Star;
    const movesExhausted = state.movesLeft <= 0;
    const won = isJellyLevel ? (jellyCleared && scoreMet) : scoreMet;
    const failed = movesExhausted && !won;

    if (won) {
      const stars = Scoring.calcStars(
        state.score, state.movesLeft, state.level.moves,
        state.level.target1Star, state.level.target2Star, state.level.target3Star
      );
      state.phase = 'COMPLETE';
      AudioFX.levelComplete();
      Storage.setLevelStars(state.level.id, stars);
      Storage.setHighScore(state.level.id, state.score);

      // Award coins: 50 per star
      Storage.addCoins(stars * 50);

      const worldLevels = Levels.getAll().filter(l => l.world === state.level.world);
      const allComplete = worldLevels.every(l => Storage.getLevelStars(l.id) > 0);
      if (allComplete && state.level.world < 6) {
        Storage.setUnlockedWorld(state.level.world + 1);
      }

      await UI._sleep(400);
      UI.showLevelComplete(stars, state.score);
      state.levelStarted = false;

      document.getElementById('btn-next-level').onclick = () => {
        AudioFX.buttonTap();
        const next = Levels.getNextLevel(state.level.id);
        if (next) startLevel(next.id);
        else gotoWorldMap();
      };
    } else if (failed) {
      // On first fail, show extra moves option
      state.phase = 'FAIL';
      AudioFX.levelFail();
      await UI._sleep(400);
      UI.showLevelFail(state.score, state.level.id);
      state.levelStarted = false; // Allow life on next attempt

      // Enable/disable extra moves button based on coins
      const btnExtra = document.getElementById('btn-extra-moves');
      if (btnExtra) {
        const coins = Storage.getCoins();
        if (coins >= 10) {
          btnExtra.classList.remove('disabled');
          btnExtra.disabled = false;
          btnExtra.textContent = '+5 Moves (10 🪙)';
        } else {
          btnExtra.classList.add('disabled');
          btnExtra.disabled = true;
          btnExtra.textContent = '+5 Moves (need 10 🪙)';
        }
      }
    } else {
      state.phase = 'IDLE';
      Input.enable();
    }
  }

  // ===== SCREEN BUTTONS =====
  function setupButtons() {
    document.getElementById('btn-next-level').addEventListener('click', () => {
      AudioFX.buttonTap();
      const next = Levels.getNextLevel(state.level.id);
      if (next) startLevel(next.id);
    });

    document.getElementById('btn-replay-win').addEventListener('click', () => {
      AudioFX.buttonTap();
      if (Storage.getLives() <= 0) {
        showNoLives(state.level.id);
        return;
      }
      startLevel(state.level.id);
    });

    document.getElementById('btn-map-win').addEventListener('click', () => {
      AudioFX.buttonTap();
      gotoWorldMap();
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      AudioFX.buttonTap();
      if (Storage.getLives() <= 0) {
        document.getElementById('level-fail').classList.remove('active');
        showNoLives(state.level.id);
        return;
      }
      startLevel(state.level.id);
    });

    document.getElementById('btn-extra-moves').addEventListener('click', () => {
      AudioFX.buttonTap();
      if (Storage.spendCoins(10)) {
        state.movesLeft += 5;
        state.extraMovesUsed += 5;
        state.phase = 'IDLE';
        Input.enable();
        document.getElementById('level-fail').classList.remove('active');
        UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);
        updateLivesDisplay();
      }
    });

    document.getElementById('btn-map-fail').addEventListener('click', () => {
      AudioFX.buttonTap();
      gotoWorldMap();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      if (state.phase === 'PAUSED') return;
      AudioFX.buttonTap();
      state.phase = 'PAUSED';
      Input.disable();
      UI.showPause();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      AudioFX.buttonTap();
      state.phase = 'IDLE';
      UI.hidePause();
      Input.enable();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      AudioFX.buttonTap();
      UI.hidePause();
      if (Storage.getLives() <= 0) {
        showNoLives(state.level.id);
        return;
      }
      startLevel(state.level.id);
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
      AudioFX.buttonTap();
      UI.hidePause();
      gotoWorldMap();
    });

    // ---- Shop navigation ----
    document.getElementById('btn-open-shop')?.addEventListener('click', () => {
      AudioFX.buttonTap();
      UI.showShop();
    });

    document.getElementById('btn-back-shop')?.addEventListener('click', () => {
      AudioFX.buttonTap();
      UI.showWorldMap();
    });

    // ---- Shop tabs ----
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        AudioFX.buttonTap();
        UI._renderShopTab(tab.dataset.tab);
      });
    });

    // ---- Booster buttons ----
    const btnMoves = document.getElementById('booster-moves');
    const btnHammer = document.getElementById('booster-hammer');
    const btnBomb = document.getElementById('booster-bomb');

    if (btnMoves) {
      btnMoves.addEventListener('click', () => {
        if (state.phase !== 'IDLE') return;
        if (state.hammerMode) { deactivateAllBoosters(); return; }
        if (!Storage.useBooster('moves')) return;
        AudioFX.buttonTap();
        state.movesLeft += 3;
        updateBoosterCounts();
        UI.updateHUD(state.level, state.score, state.movesLeft, state.jellyLeft);
      });
    }

    if (btnHammer) {
      btnHammer.addEventListener('click', () => {
        if (state.phase !== 'IDLE') return;
        if (state.hammerMode) { deactivateAllBoosters(); return; }
        if (Storage.getBoosterCount('hammer') <= 0) return;
        AudioFX.buttonTap();
        state.hammerMode = true;
        btnHammer.classList.add('active');
        btnBomb && btnBomb.classList.remove('active');
        UI.clearHighlight();
        UI.showCombo('Tap a candy to smash!');
      });
    }

    if (btnBomb) {
      btnBomb.addEventListener('click', () => {
        if (state.phase !== 'IDLE') return;
        if (state.hammerMode) { deactivateAllBoosters(); return; }
        if (Storage.getBoosterCount('bomb') <= 0) return;
        if (!Storage.useBooster('bomb')) return;
        deactivateAllBoosters();
        useBomb();
      });
    }

    setupAdminToggle();
  }

  function setupAdminToggle() {
    const btn = document.getElementById('btn-admin');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const active = btn.classList.contains('active');
      if (active) {
        Storage.restoreAdminSnapshot();
        btn.classList.remove('active');
        btn.title = 'Admin Mode';
      } else {
        Storage.saveAdminSnapshot();
        const adminProgress = {};
        for (let i = 1; i <= 60; i++) adminProgress[i] = 3;
        Storage.set('progress', adminProgress);
        Storage.setUnlockedWorld(6);
        Storage.set('coins', 9999);
        Storage.set('goldbars', 9999);
        Storage.set('boosters', { moves: 99, hammer: 99, bomb: 99 });
        Storage.set('lives', { lives: 5, lastRegenTime: Date.now() + 365*24*3600000 });
        btn.classList.add('active');
        btn.title = 'Admin Mode ON — click to restore';
      }
      if (document.getElementById('world-map').classList.contains('active')) {
        UI.showWorldMap();
      } else if (document.getElementById('level-grid').classList.contains('active')) {
        const gridTitle = document.getElementById('grid-world-name');
        const world = UI.WORLD_DATA.find(w => w.name === gridTitle.textContent);
        if (world) UI.showLevelGrid(world.id);
      }
    });
  }

  function gotoWorldMap() {
    document.querySelectorAll('.screen.overlay').forEach(s => s.classList.remove('active'));
    state.levelStarted = false;
    deactivateAllBoosters();
    if (state.level) {
      UI.showLevelGrid(state.level.world);
    } else {
      UI.showWorldMap();
    }
  }

  // ===== INIT =====
  async function init() {
    setupInput();
    setupButtons();
    await Levels.load();
    UI.showWorldMap();
  }

  window._SS._startLevel = startLevel;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
