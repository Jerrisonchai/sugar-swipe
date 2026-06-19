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
    { id: 1, name: 'Candy Meadow', bg: 'linear-gradient(135deg, #a8e6cf 0%, #7bed9f 100%)', levels: [1,2,3,4,5,6,7,8,9,10] },
    { id: 2, name: 'Frosted Peaks', bg: 'linear-gradient(135deg, #b8dff0 0%, #5b9bd5 100%)', levels: [11,12,13,14,15,16,17,18,19,20] },
    { id: 3, name: 'Chocolate Swamp', bg: 'linear-gradient(135deg, #6b4226 0%, #a0522d 100%)', levels: [], locked: true },
    { id: 4, name: 'Licorice Lab', bg: 'linear-gradient(135deg, #2d1b69 0%, #6b3fa0 100%)', levels: [], locked: true },
    { id: 5, name: 'Marmalade Manor', bg: 'linear-gradient(135deg, #ff6348 0%, #ffa502 100%)', levels: [], locked: true },
    { id: 6, name: 'Rainbow Summit', bg: 'linear-gradient(135deg, #667eea 0%, #a55eea 100%)', levels: [], locked: true },
  ],

  showWorldMap() {
    this.showScreen('world-map');
    var container = document.getElementById('world-list');
    if (!container) return;
    var Storage = window._SS.Storage;
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
      if (w.locked || !unlocked) {
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
};

window._SS.UI = UI;
