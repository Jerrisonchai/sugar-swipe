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
      var prevCompleted = i === 0 || Storage.getLevelStars(world.levels[i - 1]) > 0;
      var locked = !prevCompleted && i > 0;
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

};

window._SS.UI = UI;
