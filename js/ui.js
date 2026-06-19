/* ui.js — Rendering, HUD, screens, particles for Sugar Swipe */

window._SS = window._SS || {};

const UI = {

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

  /* Get a candy DOM element at position */
  getCellEl(row, col) {
    return document.querySelector(`.candy[data-row="${row}"][data-col="${col}"]`);
  },

  /* ---- Selection highlight ---- */
  highlightCell(row, col) {
    this.clearHighlight();
    const el = this.getCellEl(row, col);
    if (el) el.classList.add('candy--selected');
  },

  clearHighlight() {
    document.querySelectorAll('.candy--selected').forEach(el => {
      el.classList.remove('candy--selected');
    });
  },

  /* ---- Swap animation ---- */
  animateSwap(r1, c1, r2, c2, onComplete) {
    const el1 = this.getCellEl(r1, c1);
    const el2 = this.getCellEl(r2, c2);
    if (!el1 || !el2) { onComplete?.(); return; }

    const boardEl = document.getElementById('board');
    const cellW = boardEl.clientWidth / Board.cols;
    const cellH = boardEl.clientHeight / Board.rows;

    const dx = (c2 - c1) * (cellW + 4); // 4px gap
    const dy = (r2 - r1) * (cellH + 4);

    el1.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    el2.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    el1.style.transform = `translate(${dx}px, ${dy}px)`;
    el2.style.transform = `translate(${-dx}px, ${-dy}px)`;

    setTimeout(() => {
      el1.style.transition = 'none';
      el2.style.transition = 'none';
      el1.style.transform = '';
      el2.style.transform = '';
      this.renderBoard(Board); // Re-render to sync DOM with model
      onComplete?.();
    }, 220);
  },

  /* ---- Match pop animation ---- */
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
    this.renderBoard(Board); // Board model already updated

    // Animate spawns
    for (const { row, col } of spawns) {
      const el = this.getCellEl(row, col);
      if (el) el.classList.add('candy--spawning');
    }

    // Drops are handled by CSS transitions in renderBoard re-render
    // The visual difference comes from re-rendering after gravity applied
  },

  /* ---- Particle burst on matched candy ---- */
  _burstParticles(row, col, el) {
    const canvas = document.getElementById('particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = el.getBoundingClientRect();
    const boardRect = document.getElementById('board').getBoundingClientRect();

    canvas.width = boardRect.width;
    canvas.height = boardRect.height;

    const cx = rect.left - boardRect.left + rect.width / 2;
    const cy = rect.top - boardRect.top + rect.height / 2;

    const color = getComputedStyle(el).backgroundColor || '#ffd700';
    const particles = [];

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: 2 + Math.random() * 4,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
        color,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) continue;
        alive = true;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x + 1, p.y - 1, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba');
        if (p.color.startsWith('#')) {
          ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.6})`;
        }
        ctx.fill();
      }

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    requestAnimationFrame(animate);
  },

  /* ---- Combo text popup ---- */
  showCombo(text) {
    if (!text) return;
    const el = document.getElementById('combo-popup');
    const span = document.createElement('div');
    span.className = 'combo-text';
    span.textContent = text;
    el.appendChild(span);
    setTimeout(() => span.remove(), 1500);
  },

  /* ---- Score popup at a position ---- */
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

  /* ---- HUD Updates ---- */
  updateHUD(level, score, moves) {
    document.getElementById('hud-level').textContent = level.id;
    document.getElementById('hud-score').textContent = score.toLocaleString();
    document.getElementById('hud-target').textContent = level.target1Star.toLocaleString();
    document.getElementById('hud-moves').textContent = moves;
  },

  /* ---- Screens ---- */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  },

  showLevelComplete(stars, score) {
    document.getElementById('result-score').textContent = `Score: ${score.toLocaleString()}`;
    const starEls = document.querySelectorAll('#stars-container .star');
    starEls.forEach((el, i) => {
      el.classList.remove('earned');
      setTimeout(() => {
        if (i < stars) el.classList.add('earned');
      }, i * 300);
    });
    this.showScreen('level-complete');
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

  /* ---- Board shake ---- */
  shakeBoard() {
    const el = document.getElementById('board');
    el.classList.add('board-shake');
    setTimeout(() => el.classList.remove('board-shake'), 500);
  },

  /* ---- Utility ---- */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

window._SS.UI = UI;
