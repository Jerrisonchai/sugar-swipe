/* ui.js — Rendering, HUD, screens, particles, confetti for Sugar Swipe — Phase 3 */

window._SS = window._SS || {};

const UI = {
  /* Particle color palettes per candy type */
  PARTICLE_COLORS: {
    red: ['#ff6b6b', '#ee5a24', '#ffcccc'],
    orange: ['#ffa502', '#ff6348', '#ffe0b2'],
    yellow: ['#ffd32a', '#ff9f43', '#fff9c4'],
    green: ['#7bed9f', '#2ed573', '#c8e6c9'],
    blue: ['#70a1ff', '#1e90ff', '#bbdefb'],
    purple: ['#a55eea', '#8854d0', '#e1bee7'],
  },

  /* ---- Board Rendering ---- */
  renderBoard(board) {
    const el = document.getElementById('board');
    el.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;
    el.innerHTML = '';

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const candy = board.get(r, c);
        const cell = document.createElement('div');
        cell.className = 'candy';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Obstacle overlay (rendered on top of candy)
        const obs = board.getObstacle(r, c);
        if (obs) {
          cell.classList.add(`candy--obstacle`);
          cell.classList.add(`candy--ice-${Math.min(obs.layers, 3)}`);
        }

        // Jelly underlay
        if (board.hasJelly(r, c)) {
          cell.classList.add('candy--jelly');
        }

        if (candy) {
          cell.classList.add(`candy-${candy.type}`);
          if (candy.special) {
            cell.classList.add(`candy--${candy.special}`);
          }
        } else {
          cell.classList.add('candy--empty');
        }

        el.appendChild(cell);
      }
    }
  },

  getCellEl(row, col) {
    return document.querySelector(`.candy[data-row="${row}"][data-col="${col}"]`);
  },

  /* ---- Selection ---- */
  highlightCell(row, col) {
    this.clearHighlight();
    const el = this.getCellEl(row, col);
    if (el) el.classList.add('candy--selected');
  },

  clearHighlight() {
    document.querySelectorAll('.candy--selected').forEach(el => el.classList.remove('candy--selected'));
  },

  /* ---- Swap animation ---- */
  animateSwap(r1, c1, r2, c2, onComplete) {
    const el1 = this.getCellEl(r1, c1);
    const el2 = this.getCellEl(r2, c2);
    if (!el1 || !el2) { onComplete?.(); return; }

    const boardEl = document.getElementById('board');
    const cellW = boardEl.clientWidth / Board.cols;
    const cellH = boardEl.clientHeight / Board.rows;
    const dx = (c2 - c1) * (cellW + 4);
    const dy = (r2 - r1) * (cellH + 4);

    el1.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    el2.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    el1.style.transform = `translate(${dx}px, ${dy}px)`;
    el2.style.transform = `translate(${-dx}px, ${-dy}px)`;

    setTimeout(() => {
      el1.style.transition = 'none'; el2.style.transition = 'none';
      el1.style.transform = ''; el2.style.transform = '';
      this.renderBoard(Board);
      onComplete?.();
    }, 220);
  },

  /* ---- Match pop with enhanced particles ---- */
  async animateMatches(cells) {
    for (const { r, c } of cells) {
      const el = this.getCellEl(r, c);
      if (el) {
        el.classList.add('candy--matched');
        this._burstParticles(r, c, el);
      }
    }
    await this._sleep(350);
  },

  /* ---- Cascade animation ---- */
  animateCascade(drops, spawns) {
    this.renderBoard(Board);
    for (const { row, col } of spawns) {
      const el = this.getCellEl(row, col);
      if (el) el.classList.add('candy--spawning');
    }
  },

  /* ---- Special activation VFX ---- */
  showStripedFlash(row, col, horizontal) {
    const el = document.getElementById('board-container');
    const rect = el.getBoundingClientRect();
    const cellH = rect.height / Board.rows;
    const cellW = rect.width / Board.cols;
    const boardTop = 0;
    const boardLeft = 0;

    const flash = document.createElement('div');
    flash.style.cssText = `
      position:absolute; pointer-events:none; z-index:15;
      background: rgba(255,255,255,0.7);
      animation: stripedFlash 0.4s ease-out forwards;
    `;
    if (horizontal) {
      flash.style.cssText += `left:0; top:${row * cellH}px; width:100%; height:${cellH}px;`;
    } else {
      flash.style.cssText += `left:${col * cellW}px; top:0; width:${cellW}px; height:100%;`;
    }
    el.appendChild(flash);
    setTimeout(() => flash.remove(), 450);
  },

  showWrappedExplode(row, col) {
    const el = document.getElementById('board-container');
    const cell = this.getCellEl(row, col);
    if (!cell) return;
    const boardRect = document.getElementById('board').getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const cx = cellRect.left - boardRect.left + cellRect.width / 2;
    const cy = cellRect.top - boardRect.top + cellRect.height / 2;
    const size = cellRect.width;

    const ring = document.createElement('div');
    ring.style.cssText = `
      position:absolute; pointer-events:none; z-index:16;
      left:${cx - size/2}px; top:${cy - size/2}px;
      width:${size}px; height:${size}px;
      border-radius:50%; border:3px solid rgba(255,215,0,0.8);
      animation: wrappedExplode 0.5s ease-out forwards;
    `;
    el.appendChild(ring);
    setTimeout(() => ring.remove(), 550);
  },

  showBombSweep(targetType) {
    const colorMap = { red: '#ff6b6b', orange: '#ffa502', yellow: '#ffd32a', green: '#7bed9f', blue: '#70a1ff', purple: '#a55eea' };
    const color = colorMap[targetType] || '#ffd700';
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:50;
      background: ${color};
      animation: bombSweepFlash 0.6s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 650);
  },

  /* ---- Ice break VFX ---- */
  showIceBreak(row, col) {
    const el = this.getCellEl(row, col);
    if (!el) return;
    el.classList.add('candy--ice-break');
    setTimeout(() => el.classList.remove('candy--ice-break'), 400);
  },

  /* ---- Enhanced particle burst (15 particles, per-candy colors) ---- */
  _burstParticles(row, col, el) {
    const canvas = document.getElementById('particles');
    if (!canvas || !el) return;
    const ctx = canvas.getContext('2d');
    const rect = el.getBoundingClientRect();
    const boardRect = document.getElementById('board').getBoundingClientRect();

    canvas.width = boardRect.width;
    canvas.height = boardRect.height;

    const cx = rect.left - boardRect.left + rect.width / 2;
    const cy = rect.top - boardRect.top + rect.height / 2;

    // Determine candy type from class
    const type = (el.className.match(/candy-(red|orange|yellow|green|blue|purple)/) || [])[1];
    const palette = this.PARTICLE_COLORS[type] || ['#ffffff', '#ffd700', '#ffcc00'];

    const particles = [];
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: 2 + Math.random() * 5,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.025,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1;
        p.alpha -= p.decay;
        if (p.alpha <= 0) continue;
        alive = true;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.8})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba')}`;
        if (p.color.startsWith('#')) {
          ctx.fillStyle = this._hexToRgba(p.color, p.alpha);
        }
        ctx.fill();
      }
      if (alive) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    requestAnimationFrame(animate);
  },

  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  /* ---- Level complete confetti ---- */
  showConfetti() {
    const colors = ['#ff6b6b', '#ffa502', '#ffd32a', '#7bed9f', '#70a1ff', '#a55eea', '#ffd700', '#ff6348'];
    const container = document.body;
    const pieces = [];

    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      const size = 4 + Math.random() * 8;
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = 1.5 + Math.random() * 2;
      piece.style.cssText = `
        position:fixed; pointer-events:none; z-index:100;
        left:${left}%; top:-10px;
        width:${size}px; height:${size}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        animation: confettiFall ${duration}s ease-in ${delay}s forwards;
      `;
      container.appendChild(piece);
      pieces.push(piece);
    }

    setTimeout(() => pieces.forEach(p => p.remove()), 3500);
  },

  /* ---- Score tick-up animation ---- */
  tickScore(newScore) {
    const el = document.getElementById('hud-score');
    el.classList.add('score-tick');
    el.textContent = newScore.toLocaleString();
    setTimeout(() => el.classList.remove('score-tick'), 200);
  },

  /* ---- Combo text ---- */
  showCombo(text) {
    if (!text) return;
    const container = document.getElementById('combo-popup');
    const span = document.createElement('div');
    span.className = 'combo-text';
    span.textContent = text;
    container.appendChild(span);
    setTimeout(() => span.remove(), 1500);
  },

  showScorePopup(row, col, points) {
    const el = this.getCellEl(row, col);
    if (!el) return;
    const boardRect = document.getElementById('board').getBoundingClientRect();
    const cellRect = el.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    popup.style.left = (cellRect.left - boardRect.left + cellRect.width / 2) + 'px';
    popup.style.top = (cellRect.top - boardRect.top) + 'px';
    document.getElementById('board-container').appendChild(popup);
    setTimeout(() => popup.remove(), 900);
  },

  /* ---- HUD ---- */
  updateHUD(level, score, moves, jellyLeft) {
    document.getElementById('hud-level').textContent = level.id;
    this.tickScore(score);
    document.getElementById('hud-target').textContent = level.target1Star.toLocaleString();
    document.getElementById('hud-moves').textContent = moves;

    // Jelly progress for jelly levels
    const jellyEl = document.getElementById('hud-jelly');
    if (level.type === 'jelly' && jellyLeft > 0) {
      const total = level.jelly.length;
      jellyEl.textContent = `🍮 ${total - jellyLeft}/${total}`;
      jellyEl.style.display = 'block';
    } else if (level.type === 'jelly' && jellyLeft === 0) {
      jellyEl.textContent = '🍮 CLEAR!';
      jellyEl.style.display = 'block';
    } else {
      jellyEl.style.display = 'none';
    }
  },

  /* ---- Screens with transitions ---- */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
      if (s.classList.contains('active')) s.classList.add('screen-exit');
      s.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active', 'screen-enter');
      setTimeout(() => target.classList.remove('screen-enter'), 400);
    }
  },

  showLevelComplete(stars, score) {
    document.getElementById('result-score').textContent = `Score: ${score.toLocaleString()}`;
    const starEls = document.querySelectorAll('#stars-container .star');
    starEls.forEach((el, i) => {
      el.classList.remove('earned');
      setTimeout(() => {
        if (i < stars) {
          el.classList.add('earned');
          // Sound per star
          if (window._SS.AudioFX) window._SS.AudioFX.starEarned();
        }
      }, i * 300);
    });
    this.showScreen('level-complete');
    if (stars >= 2) this.showConfetti();
  },

  showLevelFail(score) {
    document.getElementById('fail-score').textContent = `Score: ${score.toLocaleString()}`;
    this.showScreen('level-fail');
  },

  showGameScreen() {
    this.showScreen('game-screen');
  },

  showPause() {
    document.getElementById('pause-screen').classList.add('active');
  },

  hidePause() {
    document.getElementById('pause-screen').classList.remove('active');
  },

  shakeBoard() {
    const el = document.getElementById('board');
    el.classList.add('board-shake');
    setTimeout(() => el.classList.remove('board-shake'), 500);
  },

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /* ===== WORLD MAP ===== */

  WORLD_DATA: [
    { id: 1, name: 'Candy Meadow', bg: 'linear-gradient(135deg, #a8e6cf 0%, #7bed9f 100%)', gridBg: 'linear-gradient(180deg, #1a2a1a 0%, #0d1f0d 100%)', quote: 'Where sweetness blooms in every row.', levels: [1,2,3,4,5,6,7,8,9,10] },
    { id: 2, name: 'Frosted Peaks', bg: 'linear-gradient(135deg, #b8dff0 0%, #5b9bd5 100%)', gridBg: 'linear-gradient(180deg, #0f1a2e 0%, #0a1020 100%)', quote: 'The cold never bothered this candy.', levels: [11,12,13,14,15,16,17,18,19,20] },
    { id: 3, name: 'Chocolate Swamp', bg: 'linear-gradient(135deg, #6b4226 0%, #a0522d 100%)', gridBg: 'linear-gradient(180deg, #1a120c 0%, #0d0906 100%)', quote: 'Muddy waters hide sugary secrets.', levels: [21,22,23,24,25,26,27,28,29,30] },
    { id: 4, name: 'Licorice Lab', bg: 'linear-gradient(135deg, #2d1b69 0%, #6b3fa0 100%)', gridBg: 'linear-gradient(180deg, #141024 0%, #0a0816 100%)', quote: 'Twisted experiments in sugar chemistry.', levels: [31,32,33,34,35,36,37,38,39,40] },
    { id: 5, name: 'Marmalade Manor', bg: 'linear-gradient(135deg, #ff6348 0%, #ffa502 100%)', gridBg: 'linear-gradient(180deg, #1f0f08 0%, #120803 100%)', quote: 'A sticky estate of citrus delights.', levels: [41,42,43,44,45,46,47,48,49,50] },
    { id: 6, name: 'Rainbow Summit', bg: 'linear-gradient(135deg, #667eea 0%, #a55eea 100%)', gridBg: 'linear-gradient(180deg, #141428 0%, #0c0c1a 100%)', quote: 'At the peak, every color shines as one.', levels: [51,52,53,54,55,56,57,58,59,60] },
  ],

  showWorldMap() {
    this.showScreen('world-map');
    var Storage = window._SS.Storage;
    document.getElementById('map-lives') && (document.getElementById('map-lives').textContent = Storage.getLives());
    document.getElementById('map-coins') && (document.getElementById('map-coins').textContent = Storage.getCoins());
    document.getElementById('map-goldbars') && (document.getElementById('map-goldbars').textContent = Storage.getGoldBars());
    var container = document.getElementById('world-list');
    if (!container) return;
    var worlds = this.WORLD_DATA;
    var html = '';
    for (var i = 0; i < worlds.length; i++) {
      var w = worlds[i];
      var unlocked = !w.locked && (w.id === 1 || Storage.getUnlockedWorld() >= w.id);
      var starsEarned = 0;
      var totalLevels = w.levels.length;
      for (var j = 0; j < w.levels.length; j++) {
        starsEarned += Storage.getLevelStars(w.levels[j]);
      }
      var maxStars = totalLevels * 3;
      if (!unlocked) {
        html += '<div class="world-card world-card--locked" style="background:' + w.bg + '"><div class="world-card-name">' + w.name + '</div><div class="world-card-stars">Coming Soon</div><div class="world-card-lock">🔒</div></div>';
      } else {
        html += '<div class="world-card" style="background:' + w.bg + '" data-world="' + w.id + '"><div class="world-card-name">' + w.name + '</div><div class="world-card-stars">⭐ ' + starsEarned + '/' + maxStars + '</div></div>';
      }
    }
    container.innerHTML = html;
    var self = this;
    container.querySelectorAll('.world-card:not(.world-card--locked)').forEach(function(card) {
      card.addEventListener('click', function() {
        self.showLevelGrid(parseInt(card.dataset.world));
      });
    });
  },

  showLevelGrid(worldId) {
    this.showScreen('level-grid');
    var Storage = window._SS.Storage;
    var world = this.WORLD_DATA.find(function(w) { return w.id === worldId; });
    if (!world) return;
    document.getElementById('grid-world-name').textContent = world.name;
    document.getElementById('grid-quote').textContent = world.quote || '';
    document.getElementById('level-grid').style.background = world.gridBg || 'var(--bg-primary)';
    var starsEarned = 0;
    for (var i = 0; i < world.levels.length; i++) {
      starsEarned += Storage.getLevelStars(world.levels[i]);
    }
    var maxStars = world.levels.length * 3;
    document.getElementById('grid-stars-summary').textContent = '⭐ ' + starsEarned + '/' + maxStars;
    var container = document.getElementById('level-list');
    var html = '';
    for (var i = 0; i < world.levels.length; i++) {
      var lid = world.levels[i];
      var stars = Storage.getLevelStars(lid);
      var locked = !Storage.isLevelUnlocked(lid);
      if (locked) {
        html += '<div class="level-btn level-btn--locked"><div class="level-btn-num">' + lid + '</div><div class="level-btn-stars">🔒</div></div>';
      } else {
        var starStr = stars > 0 ? '★'.repeat(stars) : '☆☆☆';
        html += '<div class="level-btn" data-level="' + lid + '"><div class="level-btn-num">' + lid + '</div><div class="level-btn-stars' + (stars > 0 ? ' has-stars' : '') + '">' + starStr + '</div></div>';
      }
    }
    container.innerHTML = html;
    var self = this;
    container.querySelectorAll('.level-btn:not(.level-btn--locked)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var levelId = parseInt(btn.dataset.level);
        if (window._SS._startLevel) window._SS._startLevel(levelId);
      });
    });
    document.getElementById('btn-back-worlds').onclick = function() { self.showWorldMap(); };
  },

  /* ===== SHOP RENDERING ===== */

  _currentShopTab: 'gold',

  showShop() {
    this.showScreen('shop-screen');
    this._updateShopBalance();
    this._renderShopTab('gold');
  },

  _updateShopBalance() {
    var Storage = window._SS.Storage;
    document.getElementById('shop-goldbars') && (document.getElementById('shop-goldbars').textContent = Storage.getGoldBars());
    document.getElementById('shop-coins') && (document.getElementById('shop-coins').textContent = Storage.getCoins());
  },

  _renderShopTab(tab) {
    this._currentShopTab = tab;
    var container = document.getElementById('shop-content');
    if (!container) return;
    var self = this;

    // Update active tab
    document.querySelectorAll('.shop-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    var html = '';
    switch (tab) {
      case 'gold':
        html = self._renderGoldPacks();
        break;
      case 'coins':
        html = self._renderCoinPacks();
        break;
      case 'boosters':
        html = self._renderBoosterPacks();
        break;
      case 'bundles':
        html = self._renderBundles();
        break;
      case 'inventory':
        html = self._renderInventory();
        break;
    }
    container.innerHTML = html;
    self._bindShopClicks(tab);
  },

  _renderGoldPacks() {
    var Shop = window._SS.Shop;
    var html = '<div class="shop-subtitle">Buy Gold Bars with Real Money</div>';
    html += '<div class="shop-grid">';
    for (var i = 0; i < Shop.GOLD_PACKS.length; i++) {
      var p = Shop.GOLD_PACKS[i];
      var tagHtml = p.tag ? '<span class="shop-tag">' + p.tag + '</span>' : '';
      var bonusHtml = p.bonus > 0 ? '<span class="shop-bonus">+' + p.bonus + ' Bonus!</span>' : '';
      html += '<div class="shop-card' + (p.tag === 'Best Value' ? ' shop-card--featured' : '') + '" data-pack="' + p.id + '">';
      html += tagHtml;
      html += '<div class="shop-card-icon">💰</div>';
      html += '<div class="shop-card-name">' + p.name + '</div>';
      html += '<div class="shop-card-amount">' + p.amount + ' <small>Gold</small></div>';
      if (bonusHtml) html += bonusHtml;
      html += '<div class="shop-card-price">' + p.price + '</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  _renderCoinPacks() {
    var Shop = window._SS.Shop;
    var Storage = window._SS.Storage;
    var gb = Storage.getGoldBars();
    var html = '<div class="shop-subtitle">Exchange Gold Bars for Coins</div>';
    html += '<div class="shop-grid">';
    for (var i = 0; i < Shop.COIN_PACKS.length; i++) {
      var p = Shop.COIN_PACKS[i];
      var tagHtml = p.tag ? '<span class="shop-tag">' + p.tag + '</span>' : '';
      var canAfford = gb >= p.cost;
      html += '<div class="shop-card' + (!canAfford ? ' shop-card--locked' : '') + '" data-pack="' + p.id + '">';
      html += tagHtml;
      html += '<div class="shop-card-icon">🪙</div>';
      html += '<div class="shop-card-name">' + p.name + '</div>';
      html += '<div class="shop-card-amount">' + p.amount + ' <small>Coins</small></div>';
      html += '<div class="shop-card-price">' + p.cost + ' 💰</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  _renderBoosterPacks() {
    var Shop = window._SS.Shop;
    var Storage = window._SS.Storage;
    var gb = Storage.getGoldBars();
    var html = '<div class="shop-subtitle">Stock Up on Boosters</div>';
    html += '<div class="shop-grid">';
    for (var i = 0; i < Shop.BOOSTER_PACKS.length; i++) {
      var p = Shop.BOOSTER_PACKS[i];
      var canAfford = gb >= p.cost;
      html += '<div class="shop-card' + (!canAfford ? ' shop-card--locked' : '') + '" data-pack="' + p.id + '">';
      html += '<div class="shop-card-icon">' + p.icon + '</div>';
      html += '<div class="shop-card-name">' + p.name + '</div>';
      html += '<div class="shop-card-amount">' + p.desc + '</div>';
      html += '<div class="shop-card-price">' + p.cost + ' 💰</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  _renderBundles() {
    var Shop = window._SS.Shop;
    var Storage = window._SS.Storage;
    var gb = Storage.getGoldBars();
    var html = '<div class="shop-subtitle">Special Value Bundles</div>';
    html += '<div class="shop-grid">';
    for (var i = 0; i < Shop.BUNDLES.length; i++) {
      var b = Shop.BUNDLES[i];
      var tagHtml = b.tag ? '<span class="shop-tag shop-tag--bundle">' + b.tag + '</span>' : '';
      var canAfford = gb >= b.cost;
      html += '<div class="shop-card shop-card--bundle' + (!canAfford ? ' shop-card--locked' : '') + '" data-bundle="' + b.id + '">';
      html += tagHtml;
      html += '<div class="shop-card-icon">🎁</div>';
      html += '<div class="shop-card-name">' + b.name + '</div>';
      html += '<div class="shop-bundle-items">' + b.desc + '</div>';
      html += '<div class="shop-card-price">' + b.cost + ' 💰</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  _renderInventory() {
    var Storage = window._SS.Storage;
    var boosters = Storage._getBoosters();
    var items = [
      { icon: '💰', name: 'Gold Bars', count: Storage.getGoldBars(), color: '#ffd700' },
      { icon: '🪙', name: 'Coins', count: Storage.getCoins(), color: '#ffa502' },
      { icon: '+3', name: 'Extra Moves', count: boosters.moves, color: '#70a1ff' },
      { icon: '🍭', name: 'Lollipop Hammers', count: boosters.hammer, color: '#ff6348' },
      { icon: '💣', name: 'Color Bombs', count: boosters.bomb, color: '#a55eea' },
    ];
    var html = '<div class="shop-subtitle">Your Inventory</div>';
    html += '<div class="inv-list">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      html += '<div class="inv-item">';
      html += '<span class="inv-icon" style="background:rgba(' + this._hexToRgb(it.color) + ',0.15);">' + it.icon + '</span>';
      html += '<span class="inv-name">' + it.name + '</span>';
      html += '<span class="inv-count">×' + it.count + '</span>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  _hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  },

  _bindShopClicks(tab) {
    var self = this;
    var Shop = window._SS.Shop;

    // Handle gold pack clicks (simulated purchase)
    if (tab === 'gold') {
      document.querySelectorAll('.shop-card[data-pack]').forEach(function(card) {
        card.addEventListener('click', function() {
          var packId = card.dataset.pack;
          var pack = Shop.GOLD_PACKS.find(function(p) { return p.id === packId; });
          if (!pack) return;
          self._showPurchaseConfirm(packId, 'gold', pack);
        });
      });
    }

    // Handle coin pack clicks (gold bars → coins)
    if (tab === 'coins') {
      document.querySelectorAll('.shop-card[data-pack]:not(.shop-card--locked)').forEach(function(card) {
        card.addEventListener('click', function() {
          var packId = card.dataset.pack;
          var pack = Shop.COIN_PACKS.find(function(p) { return p.id === packId; });
          if (!pack) return;
          self._showPurchaseConfirm(packId, 'coins', pack);
        });
      });
    }

    // Handle booster pack clicks
    if (tab === 'boosters') {
      document.querySelectorAll('.shop-card[data-pack]:not(.shop-card--locked)').forEach(function(card) {
        card.addEventListener('click', function() {
          var packId = card.dataset.pack;
          var pack = Shop.BOOSTER_PACKS.find(function(p) { return p.id === packId; });
          if (!pack) return;
          self._showPurchaseConfirm(packId, 'boosters', pack);
        });
      });
    }

    // Handle bundle clicks
    if (tab === 'bundles') {
      document.querySelectorAll('.shop-card[data-bundle]:not(.shop-card--locked)').forEach(function(card) {
        card.addEventListener('click', function() {
          var bid = card.dataset.bundle;
          var bundle = Shop.BUNDLES.find(function(b) { return b.id === bid; });
          if (!bundle) return;
          self._showPurchaseConfirm(bid, 'bundles', bundle);
        });
      });
    }
  },

  _showPurchaseConfirm(packId, type, item) {
    var modal = document.getElementById('purchase-modal');
    var icon = document.getElementById('purchase-icon');
    var title = document.getElementById('purchase-title');
    var desc = document.getElementById('purchase-desc');
    var confirmBtn = document.getElementById('btn-confirm-buy');

    icon.textContent = type === 'gold' ? '💳' : '💰';
    title.textContent = type === 'gold' ? 'Buy ' + item.name + '?' : 'Spend Gold Bars?';

    if (type === 'gold') {
      var total = item.amount + (item.bonus || 0);
      desc.textContent = total + ' Gold Bars for ' + item.price + (item.bonus ? ' (includes +' + item.bonus + ' bonus!)' : '');
    } else if (type === 'bundles') {
      desc.textContent = item.name + ' | ' + item.cost + ' 💰 | ' + item.desc;
    } else {
      desc.textContent = item.name + ' for ' + item.cost + ' 💰';
    }

    modal.classList.add('active');
    if (window._SS.AudioFX) window._SS.AudioFX.purchase();

    var self = this;
    confirmBtn.onclick = function() {
      modal.classList.remove('active');
      var result;
      switch (type) {
        case 'gold': result = Shop.buyGoldPack(packId); break;
        case 'coins': result = Shop.buyCoinPack(packId); break;
        case 'boosters': result = Shop.buyBoosterPack(packId); break;
        case 'bundles': result = Shop.buyBundle(packId); break;
      }
      if (result && result.success !== false) {
        self._showPurchaseSuccess(item);
      }
    };
    document.getElementById('btn-cancel-buy').onclick = function() {
      modal.classList.remove('active');
    };
  },

  _showPurchaseSuccess(item) {
    var modal = document.getElementById('purchase-success');
    var desc = document.getElementById('success-desc');
    var name = item.name || '';
    desc.textContent = name + ' added to your account!';
    modal.classList.add('active');
    if (window._SS.AudioFX) window._SS.AudioFX.purchaseSuccess();
    this._updateShopBalance();
    // Re-render current tab
    this._renderShopTab(this._currentShopTab);
    document.getElementById('btn-ok-success').onclick = function() {
      modal.classList.remove('active');
    };
  },


  /* ===== SOCIAL RENDERING ===== */

  showSocial() {
    this.showScreen('social-screen');
    var Social = window._SS.Social;
    Social.checkWeeklyReset();
    this._renderGiftBanner();
    this._renderSocialBadges();
    this._switchSocialTab('board');
  },

  /** Update gift notification badges */
  _renderSocialBadges() {
    var Social = window._SS.Social;
    var count = Social.getGiftNotifyCount();
    var badge = document.getElementById('social-btn-badge');
    var feedBadge = document.getElementById('feed-tab-badge');
    if (badge) badge.textContent = count > 0 ? count : '';
    if (badge) badge.style.display = count > 0 ? 'flex' : 'none';
    if (feedBadge) feedBadge.textContent = count > 0 ? count : '';
    if (feedBadge) feedBadge.style.display = count > 0 ? 'flex' : 'none';
  },

  _switchSocialTab(tab) {
    document.querySelectorAll('.social-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    var feed = document.getElementById('social-feed-section');
    var friends = document.getElementById('social-friends-section');
    var lb = document.getElementById('social-lb-section');
    if (feed) feed.style.display = tab === 'feed' ? 'block' : 'none';
    if (friends) friends.style.display = tab === 'friends' ? 'block' : 'none';
    if (lb) lb.style.display = tab === 'board' ? 'block' : 'none';

    if (tab === 'feed') { this._renderFeed(); this._renderGiftBanner(); }
    if (tab === 'friends') this._renderBotProfiles();
    if (tab === 'board') this._renderLeaderboard('weekly');
  },

  _renderGiftBanner() {
    var Social = window._SS.Social;
    var pending = Social.getPendingGifts();
    var banner = document.getElementById('gift-banner');
    if (!banner) return;
    if (pending.length === 0) {
      banner.classList.add('hidden');
      return;
    }
    banner.classList.remove('hidden');
    var html = '';
    for (var i = 0; i < pending.length; i++) {
      var p = pending[i];
      var gv = Social.GIFT_VALUES[p.gift.type];
      html += '<div class="gift-alert" data-bot="' + p.botId + '">';
      html += '<span class="gift-alert-emoji">' + p.bot.emoji + '</span>';
      html += '<div class="gift-alert-mid">';
      html += '<span class="gift-alert-name">' + p.bot.name + '</span>';
      html += '<span class="gift-alert-item">' + (gv ? gv.icon + ' ' + gv.label : 'a gift') + '</span>';
      html += '</div>';
      html += '<button class="gift-open-btn" data-bot="' + p.botId + '">Open 🎁</button>';
      html += '</div>';
    }
    banner.innerHTML = html;

    var self = this;
    banner.querySelectorAll('.gift-open-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var botId = btn.dataset.bot;
        var Social = window._SS.Social;
        var AudioFX = window._SS.AudioFX;
        if (AudioFX) AudioFX.purchaseSuccess();
        var result = Social.acceptGift(botId);
        if (result && result.value) {
          if (AudioFX) AudioFX.purchaseSuccess();
        }
        self._renderGiftBanner();
        self._renderSocialBadges();
        self._renderBotProfiles();
        self._renderFeed();
      });
    });
  },

  _renderFeed() {
    var Social = window._SS.Social;
    var feed = Social.getFeed(20);
    var container = document.getElementById('friend-feed');
    if (!container) return;
    if (feed.length === 0) {
      container.innerHTML = '<div class="feed-empty">✨ No activity yet. Complete some levels!</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < feed.length; i++) {
      var item = feed[i];
      var timeStr = this._formatTimeAgo(item.time);
      html += '<div class="feed-item' + (item.userId === 'player' ? '' : ' feed-item--bot') + '">';
      html += '<span class="feed-avatar">' + item.emoji + '</span>';
      html += '<div class="feed-body">';
      html += '<span class="feed-name">' + item.name + '</span> ';
      html += '<span class="feed-text">' + item.text + '</span>';
      html += '<span class="feed-time">' + timeStr + '</span>';
      html += '</div>';
      html += '</div>';
    }
    container.innerHTML = html;
    container.scrollTop = 0;
  },

  /** Bot profile cards with stories */
  _renderBotProfiles() {
    var Social = window._SS.Social;
    var Storage = window._SS.Storage;
    var isAdmin = Storage.isAdminMode ? Storage.isAdminMode() : false;
    var pending = Social.getPendingGifts();
    var pendingMap = {};
    for (var i = 0; i < pending.length; i++) pendingMap[pending[i].botId] = true;

    var data = Social._getSocialData();
    var today = new Date().toDateString();
    var sentSoFar = (data.sendDate === today) ? (data.sentCount || 0) : 0;
    var remainingSends = isAdmin ? 999 : Social.MAX_SEND_PER_DAY - sentSoFar;
    var playerCoins = Storage.getCoins ? Storage.getCoins() : 0;
    var canSend = isAdmin || (remainingSends > 0 && playerCoins >= Social.SEND_GIFT_COST);

    var container = document.getElementById('bot-list');
    if (!container) return;
    var html = '';
    // Friendship hint
    html += '<div class="friendship-hint">';
    html += '💡 <b>Higher friendship = bigger gifts!</b> Interact with bots to level up and unlock more coins & boosters.';
    html += '</div>';
    for (var i = 0; i < Social.BOTS.length; i++) {
      var bot = Social.BOTS[i];
      var hasGift = !!pendingMap[bot.id];
      html += '<div class="bot-profile' + (hasGift ? ' bot-profile--gift' : '') + '">';
      // Avatar row
      html += '<div class="bot-profile-header">';
      html += '<div class="bot-avatar-lg">' + bot.icon + '</div>';
      html += '<div class="bot-profile-title">';
      html += '<span class="bot-profile-name">' + bot.name + ' <span class="bot-profile-tag">' + bot.title + '</span></span>';
      html += '<div class="bot-traits">';
      for (var j = 0; j < bot.traits.length; j++) {
        html += '<span class="bot-trait-tag">' + bot.traits[j] + '</span>';
      }
      html += '</div>';
      html += '</div>';
      if (hasGift) html += '<div class="bot-gift-badge">🎁</div>';
      html += '</div>';
      // Friendship level
      var fp = Social.getFriendshipPoints(bot.id);
      var lvl = Social.getFriendshipLevel(bot.id);
      var ptsInLvl = fp % 5;
      var pct = Math.round((ptsInLvl / 5) * 100);
      var tierEmoji = lvl <= 5 ? '🤝' : lvl <= 10 ? '💛' : lvl <= 20 ? '🌟' : '💫';
      html += '<div class="friendship-bar">';
      html += '<span class="friendship-tier">' + tierEmoji + ' Lv.' + lvl + '</span>';
      html += '<div class="friendship-track"><div class="friendship-fill" style="width:' + pct + '%"></div></div>';
      html += '<span class="friendship-pts">' + ptsInLvl + '/5</span>';
      html += '</div>';
      // Story
      html += '<p class="bot-story">' + bot.story + '</p>';
      // Actions
      html += '<div class="bot-actions">';
      if (hasGift) {
        html += '<button class="btn-open-gift" data-bot="' + bot.id + '">🎁 Open Gift</button>';
      }
      // All 3 bot send buttons are enabled as long as player has remaining sends + coins
      html += '<button class="btn-send-gift" data-bot="' + bot.id + '"' + (!canSend ? ' disabled' : '') + '>';
      if (isAdmin) {
        html += '🎁 Send Gift (ADMIN ♾️)';
      } else if (remainingSends <= 0) {
        html += '🎁 Max Today';
      } else if (playerCoins < Social.SEND_GIFT_COST) {
        html += '🎁 Need ' + Social.SEND_GIFT_COST + ' 🪙';
      } else {
        html += '🎁 Send Gift (' + remainingSends + ' left, ' + Social.SEND_GIFT_COST + '🪙)';
      }
      html += '</button>';
      html += '</div>';
      html += '</div>';
    }
    container.innerHTML = html;

    var self = this;
    // Open gift
    container.querySelectorAll('.btn-open-gift').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var Social = window._SS.Social;
        var AudioFX = window._SS.AudioFX;
        if (AudioFX) AudioFX.purchaseSuccess();
        Social.acceptGift(btn.dataset.bot);
        self._renderBotProfiles();
        self._renderGiftBanner();
        self._renderSocialBadges();
        self._renderFeed();
      });
    });
    // Send gift — all 3 bots always bind (player can send to same bot 3x)
    container.querySelectorAll('.btn-send-gift:not([disabled])').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var AudioFX = window._SS.AudioFX;
        if (AudioFX) AudioFX.buttonTap();
        var result = window._SS.Social.sendGiftToBot(btn.dataset.bot);
        if (result && result.success) {
          if (AudioFX) AudioFX.purchase();
          self._renderBotProfiles();
          self._renderSocialBadges();
          self._renderFeed();
        }
      });
    });
  },

  _renderLeaderboard(period) {
    var Social = window._SS.Social;
    var entries = Social.getLeaderboard(period);
    var container = document.getElementById('leaderboard-list');
    if (!container) return;
    // Update lb-tab active states
    document.querySelectorAll('.lb-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.period === period);
    });
    var html = '';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var rankIcon = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : '#' + e.rank;
      html += '<div class="lb-entry' + (e.isPlayer ? ' lb-entry--player' : '') + '">';
      html += '<span class="lb-rank">' + rankIcon + '</span>';
      html += '<span class="lb-avatar">' + e.emoji + '</span>';
      html += '<div class="lb-info">';
      html += '<span class="lb-name">' + e.name + '</span>';
      html += '<span class="lb-detail">🌍 ' + (e.world || '?') + '</span>';
      html += '<span class="lb-detail">📊 ' + (e.levelsCompleted || 0) + '/' + (e.totalLevels || 60) + ' levels</span>';
      html += '<span class="lb-stars">⭐ ' + (e.stars || 0).toLocaleString() + ' stars</span>';
      html += '</div>';
      html += '<span class="lb-score">' + (e.score || 0).toLocaleString() + ' pts</span>';
      html += '</div>';
    }
    container.innerHTML = html;

    // Bind lb sub-tabs
    var self = this;
    document.querySelectorAll('.lb-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        self._renderLeaderboard(tab.dataset.period);
      });
    });
  },

  /** Bind social main tabs after DOM ready */
  bindSocialNav() {
    var self = this;
    document.querySelectorAll('.social-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        if (window._SS.AudioFX) window._SS.AudioFX.buttonTap();
        self._switchSocialTab(tab.dataset.tab);
      });
    });
  },

  _formatTimeAgo(timestamp) {
    var diff = Date.now() - timestamp;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  },


  /* ===== PHASE 9: EVENTS ===== */
  /* ---- How to Play / Info Screen ---- */
  showHowToPlay() {
    this.showScreen('info-screen');
  },

  bindInfoNav() {
    var self = this;
    var btn = document.getElementById('btn-open-info');
    if (btn) btn.addEventListener('click', function() { self.showHowToPlay(); });
    var back = document.getElementById('btn-back-info');
    if (back) back.addEventListener('click', function() { self.showWorldMap(); });
    // Info tabs
    document.querySelectorAll('.info-tab').forEach(function(t) {
      t.addEventListener('click', function() {
        document.querySelectorAll('.info-tab').forEach(function(x) { x.classList.remove('active'); });
        this.classList.add('active');
        self._renderInfoTab(this.dataset.tab);
      });
    });
    this._renderInfoTab('howto');
  },

  _renderInfoTab(tab) {
    var content = document.getElementById('info-content');
    if (!content) return;
    var html = '';
    if (tab === 'howto') {
      html = '<h3>🎯 Goal</h3><p>Swap adjacent candies to create matches of 3 or more of the same color. Complete each level\'s objective before you run out of moves!</p>'
        + '<h3>🖐️ How to Play</h3><ul><li><strong>Swipe</strong> a candy up, down, left, or right to swap it with its neighbor.</li><li>Matches of <strong>3</strong> clear those candies and earn points.</li><li>Matches of <strong>4</strong> create a <strong>Striped Candy</strong> that clears an entire row or column.</li><li>Matches of <strong>5</strong> in L/T shapes create a <strong>Wrapped Candy</strong> that explodes a 3×3 area.</li><li>Matches of <strong>5 in a row</strong> create a <strong>Color Bomb</strong> that clears all candies of one color.</li></ul>'
        + '<h3>⭐ Stars</h3><p>Earn 1-3 stars based on how far you exceed the target score. Stars unlock later levels and worlds!</p>'
        + '<h3>🧩 Obstacles</h3><ul><li><strong>Ice</strong> 🧊 — Blocks the cell until cleared by a match next to it.</li><li><strong>Chocolate</strong> 🍫 — Spreads if not cleared.</li><li><strong>Licorice</strong> 🖤 — Blocks swaps.</li><li><strong>Jelly</strong> 🍮 — Must be cleared by matching candies on top of it.</li></ul>'
        + '<h3>🎒 Boosters</h3><ul><li><strong>+3 Moves</strong> — Adds 3 extra moves.</li><li><strong>Hammer</strong> 🍭 — Tap a candy to smash it.</li><li><strong>Color Bomb</strong> 💣 — Place a bomb that clears all of one color.</li></ul>'
        + '<h3>❤️ Lives</h3><p>You start with 5 lives. Fail a level → lose 1 life. Lives regenerate automatically over time. You can also buy lives with coins or receive them as gifts from friends.</p>';
    } else if (tab === 'tips') {
      html = '<h3>💡 Pro Tips</h3>'
        + '<ul>'
        + '<li>🔍 <strong>Scan for 4-match opportunities</strong> — Striped candies are game-changers.</li>'
        + '<li>⬇️ <strong>Work from the bottom up</strong> — Cascading from the bottom creates more chain reactions.</li>'
        + '<li>🌈 <strong>Combine specials</strong> — Swap a Striped with a Color Bomb for maximum destruction!</li>'
        + '<li>🧊 <strong>Clear obstacles early</strong> — Ice and chocolate get harder the longer you wait.</li>'
        + '<li>📊 <strong>Watch your move count</strong> — Efficiency matters for earning 3 stars.</li>'
        + '<li>🎯 <strong>Focus on objectives</strong> — If it\'s a Jelly level, prioritize jelly tiles over high scores.</li>'
        + '<li>📅 <strong>Spin daily</strong> — Free rewards every day!</li>'
        + '<li>🔥 <strong>Keep your streak</strong> — Log in daily for escalating streak rewards.</li>'
        + '</ul>';
    } else if (tab === 'system') {
      html = '<h3>⚙️ System Information</h3>'
        + '<p><strong>Sugar Swipe v1.0</strong> — A premium match-3 puzzle game built with vanilla HTML/CSS/JavaScript.</p>'
        + '<p><strong>Platform:</strong> Mobile Web (PWA) + Android APK via Capacitor</p>'
        + '<p><strong>Storage:</strong> All progress is stored locally on your device (LocalStorage). No data leaves your phone.</p>'
        + '<p><strong>Audio:</strong> Procedurally generated sound effects using Web Audio API — zero audio files downloaded.</p>'
        + '<p><strong>Graphics:</strong> 100% CSS-drawn candies, gradients, and shapes — zero image files.</p>'
        + '<p><strong>Offline:</strong> Full gameplay works offline. No server required.</p>'
        + '<p><strong>Social:</strong> 3 AI bot friends (Maya, Rex, Luna) — all behavior simulated locally. No real multiplayer.</p>'
        + '<p><strong>Updates:</strong> Events refresh daily at 8:00 AM. Weekly challenges and leaderboards refresh every Monday at 8:00 AM.</p>'
        + '<p style="margin-top:16px;color:#888;font-size:11px;">Made with ❤️ by Jerrison & Luffy 🏴‍☠️ | 2026</p>';
    } else if (tab === 'privacy') {
      html = '<h3>🔒 Privacy Policy</h3>'
        + '<p><em>Effective: June 19, 2026</em></p>'
        + '<h3>📋 Data Collection</h3>'
        + '<p><strong>Sugar Swipe does NOT collect, transmit, or store ANY personal data.</strong> All game data (scores, progress, settings) is stored exclusively on your device using LocalStorage.</p>'
        + '<h3>📡 No Network Access</h3>'
        + '<p>The app does not make any network requests. No analytics, no tracking, no ads, no cloud sync.</p>'
        + '<h3>🤖 AI Bot Data</h3>'
        + '<p>The 3 AI bot friends (Maya, Rex, Luna) are entirely simulated on-device. Their scores and behavior are generated locally using pseudorandom algorithms. No data about your gameplay is used to train or influence their behavior.</p>'
        + '<h3>🛒 Purchases</h3>'
        + '<p>All in-game purchases (gold bars, coin packs) are currently simulated/mock only. No real money transactions are processed. When real payments are added (v2.0+), they will use Google Play Billing with standard privacy protections.</p>'
        + '<h3>👶 Children</h3>'
        + '<p>Sugar Swipe does not knowingly collect any personal information from children under 13. As the app collects no data at all, it is fully COPPA-compliant.</p>'
        + '<h3>📝 Changes</h3>'
        + '<p>This privacy policy may be updated in future versions. Continued use of the app after changes constitutes acceptance.</p>'
        + '<h3>📧 Contact</h3>'
        + '<p>Questions? Contact: <strong>jerrisonchai@gmail.com</strong></p>';
    }
    content.innerHTML = html;
  },

  showEvents() {
    this.showScreen('events-screen');
    var self = this;
    self._renderSpinWheel();
    self._renderChallenges();
    self._renderStreaks();
    self._updateSpinStatus();

    // Tab switching
    document.querySelectorAll('#events-screen .events-tab').forEach(function(t) {
      t.onclick = function() { self._switchEventTab(this.dataset.tab); };
    });

    // Close button
    var closeBtn = document.getElementById('btn-close-events');
    if (closeBtn) closeBtn.onclick = function() { self.showScreen('world-map'); self._updateEventBadge(); };

    // Spin button
    document.getElementById('btn-spin').onclick = function() {
      var AudioFX = window._SS.AudioFX;
      if (AudioFX) AudioFX.buttonTap();
      var EM = window._SS.EventManager;
      if (!EM.canSpinToday()) return;
      self._doSpin();
    };

    // Streak claim button
    document.getElementById('btn-claim-streak').onclick = function() {
      var AudioFX = window._SS.AudioFX;
      if (AudioFX) AudioFX.buttonTap();
      var EM = window._SS.EventManager;
      var result = EM.claimStreak();
      if (result) {
        if (AudioFX) AudioFX.streakClaim();
        self._renderStreaks();
        self._updateEventBadge();
      }
    };

    // Challenge claim buttons — delegated to _bindClaimButtons
    self._bindClaimButtons();
  },

  _switchEventTab(tab) {
    document.querySelectorAll('#events-screen .events-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.getElementById('event-spin').classList.toggle('active', tab === 'spin');
    document.getElementById('event-challenges').classList.toggle('active', tab === 'challenges');
    document.getElementById('event-streak').classList.toggle('active', tab === 'streak');
    if (tab === 'spin') this._updateSpinStatus();
    if (tab === 'challenges') this._renderChallenges();
    if (tab === 'streak') this._renderStreaks();
  },

  _renderSpinWheel() {
    var wheel = document.getElementById('spin-wheel');
    if (!wheel) return;
    var EM = window._SS.EventManager;
    var rewards = EM.SPIN_REWARDS;
    var segAngle = 360 / rewards.length;
    var html = '';
    for (var i = 0; i < rewards.length; i++) {
      var r = rewards[i];
      var angle = i * segAngle + segAngle / 2;
      var rad = angle * Math.PI / 180;
      var x = 50 + 35 * Math.cos(rad);
      var y = 50 + 35 * Math.sin(rad);
      html += '<div class="spin-segment" style="transform:rotate(' + (i * segAngle) + 'deg);">';
      html += '<span class="spin-segment-label">' + r.icon + '</span>';
      html += '</div>';
    }
    wheel.innerHTML = html;
    wheel.style.transform = 'rotate(0deg)';
  },

  _doSpin() {
    var EM = window._SS.EventManager;
    var AudioFX = window._SS.AudioFX;
    if (!EM.canSpinToday()) return;

    var btn = document.getElementById('btn-spin');
    if (btn) btn.disabled = true;

    var targetIdx = EM.getSpinTarget();
    var segAngle = 360 / EM.SPIN_REWARDS.length;
    // Land on the center of the chosen segment. Wheel rotates clockwise,
    // so the winning segment needs to be at 0° (top pointer).
    // Pointer is at top (0°). Segment i is at i*segAngle from the top.
    // To land segment i at pointer, rotate: (360 - i*segAngle - segAngle/2) + random within segment
    var targetAngle = 360 - targetIdx * segAngle - segAngle / 2;
    targetAngle += (Math.random() * 0.8 - 0.4) * segAngle; // slight randomness within segment
    var totalSpin = 360 * 5 + targetAngle; // 5 full rotations + target

    var wheel = document.getElementById('spin-wheel');
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheel.style.transform = 'rotate(' + totalSpin + 'deg)';

    // Spin tick sounds
    var tickCount = 0;
    var tickInterval = setInterval(function() {
      if (tickCount < 25 && AudioFX) AudioFX.spinTick();
      tickCount++;
      if (tickCount > 25) clearInterval(tickInterval);
    }, 150);

    var self = this;
    var reward = EM.SPIN_REWARDS[targetIdx];
    setTimeout(function() {
      clearInterval(tickInterval);
      EM.doSpin(); // actually grant the reward
      if (AudioFX) AudioFX.spinWin();
      // Bounce pointer
      document.querySelector('.spin-pointer').classList.add('bouncing');
      setTimeout(function() { document.querySelector('.spin-pointer').classList.remove('bouncing'); }, 300);
      self._showSpinReward(reward);
      self._updateSpinStatus();
      self._updateEventBadge();
    }, 4200);
  },

  _showSpinReward(reward) {
    // Remove existing modal if any
    var old = document.getElementById('spin-reward-modal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'spin-reward-modal';
    modal.innerHTML = '<div class="spin-reward-card">' +
      '<div class="spin-reward-icon">' + reward.icon + '</div>' +
      '<div class="spin-reward-label">' + reward.label + '</div>' +
      '<button class="spin-reward-btn">🎉 Awesome!</button>' +
      '</div>';
    document.body.appendChild(modal);

    var self = this;
    modal.querySelector('.spin-reward-btn').onclick = function() {
      modal.remove();
      var btn = document.getElementById('btn-spin');
      if (btn) btn.disabled = true;
    };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  },

  _updateSpinStatus() {
    var el = document.getElementById('spin-status');
    var btn = document.getElementById('btn-spin');
    var can = window._SS.EventManager.canSpinToday();
    if (el) el.textContent = can ? '🎡 Your daily spin is ready!' : '✅ Come back tomorrow for another spin!';
    if (btn) btn.disabled = !can;
  },

  _renderChallenges() {
    var list = document.getElementById('challenge-list');
    if (!list) return;
    try {
    var EM = window._SS.EventManager;
    var ch = EM.getChallenges();
    if (!ch || !ch.items) { list.innerHTML = '<p class="spin-status">Loading challenges...</p>'; return; }
    var html = '';
    for (var i = 0; i < ch.items.length; i++) {
      var item = ch.items[i];
      var prog = Math.min(item.target, ch.progress[i] || 0);
      var pct = Math.round((prog / item.target) * 100);
      var complete = prog >= item.target;
      var claimed = ch.claimed[i];

      // Build reward text
      var rew = '';
      if (item.reward.coins) rew += item.reward.coins + ' 🪙 ';
      if (item.reward.booster_hammer) rew += item.reward.booster_hammer + 'x 🍭 ';
      if (item.reward.booster_moves) rew += item.reward.booster_moves + 'x +3 ';
      if (item.reward.booster_bomb) rew += item.reward.booster_bomb + 'x 💣 ';

      var cls = claimed ? ' challenge-card--claimed' : complete ? ' challenge-card--complete' : '';
      html += '<div class="challenge-card' + cls + '">';
      html += '<div class="challenge-desc">' + item.desc + '</div>';
      html += '<div class="challenge-bar-wrap"><div class="challenge-bar-fill" style="width:' + pct + '%"></div></div>';
      html += '<div class="challenge-bar-text">' + prog + '/' + item.target + ' (' + pct + '%)</div>';
      html += '<div class="challenge-reward">🎁 ' + rew.trim() + '</div>';
      if (claimed) {
        html += '<button class="btn--claimed" disabled>✅ Claimed</button>';
      } else if (complete) {
        html += '<button class="btn--claim" data-idx="' + i + '">🏆 Claim!</button>';
      }
      html += '</div>';
    }
    list.innerHTML = html;
    // Re-bind claim buttons (needed when _renderChallenges is called standalone, not just from showEvents)
    this._bindClaimButtons();
    } catch(e) { list.innerHTML = '<p class="spin-status">No challenges available</p>'; console.warn('_renderChallenges error:', e); }
  },

  _bindClaimButtons() {
    var self = this;
    document.querySelectorAll('.btn--claim').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(this.dataset.idx);
        console.log('[claimBtn] clicked idx=' + idx);
        var AudioFX = window._SS.AudioFX;
        if (AudioFX) AudioFX.challengeComplete();
        var result = window._SS.EventManager.claimChallenge(idx);
        if (result) {
          console.log('[claimBtn] claim success:', result);
          self._renderChallenges();
          self._updateEventBadge();
        } else {
          console.warn('[claimBtn] claim failed for idx=' + idx);
        }
      };
    });
  },

  _renderStreaks() {
    var cal = document.getElementById('streak-calendar');
    if (!cal) return;
    var EM = window._SS.EventManager;
    var s = EM.getStreak();
    var canClaim = EM.canClaimStreak();
    var html = '';
    for (var i = 0; i < 7; i++) {
      var sr = EM.STREAK_REWARDS[i];
      var dayNum = i + 1;
      var isClaimed = s.claimed[dayNum];
      var isToday = dayNum === s.current && !s.claimed[dayNum];
      var isPast = dayNum < s.current && !isClaimed;
      var cls = isClaimed ? ' streak-day--claimed' : isToday ? ' streak-day--today' : isPast ? ' streak-day--missed' : '';
      html += '<div class="streak-day' + cls + '">';
      html += '<span class="streak-day-icon">' + (isClaimed ? '✅' : sr.icon) + '</span>';
      html += '<span class="streak-day-num">Day ' + dayNum + '</span>';
      html += '</div>';
    }
    cal.innerHTML = html;

    var btn = document.getElementById('btn-claim-streak');
    var info = document.querySelector('.streak-info');
    var targetDay = EM.STREAK_REWARDS[s.current - 1];
    if (canClaim && btn) {
      btn.style.display = 'block';
      btn.textContent = '🔥 Claim Day ' + s.current + ' — ' + targetDay.label;
    } else if (btn) {
      btn.style.display = 'none';
    }
  },

  _updateEventBadge() {
    var badge = document.getElementById('events-btn-badge');
    if (!badge) return;
    var EM = window._SS.EventManager;
    var count = EM.getNotificationCount();
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  },

};

window._SS.UI = UI;
