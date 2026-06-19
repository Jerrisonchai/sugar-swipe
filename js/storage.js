/* storage.js — LocalStorage persistence for Sugar Swipe */

window._SS = window._SS || {};

const Storage = {
  PREFIX: 'ss_',

  get(key) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage full:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /* ---- Progress ---- */
  getLevelStars(levelId) {
    const p = this.get('progress') || {};
    return p[levelId] || 0; // 0 = not completed, 1-3 stars
  },

  setLevelStars(levelId, stars) {
    const p = this.get('progress') || {};
    if (stars > (p[levelId] || 0)) {
      p[levelId] = stars;
      this.set('progress', p);
    }
  },

  getUnlockedWorld() {
    return this.get('unlocked_world') || 1;
  },

  setUnlockedWorld(world) {
    if (world > this.getUnlockedWorld()) {
      this.set('unlocked_world', world);
    }
  },

  /* ---- Score ---- */
  getHighScore(levelId) {
    return this.get('highscores')?.[levelId] || 0;
  },

  setHighScore(levelId, score) {
    const hs = this.get('highscores') || {};
    if (score > (hs[levelId] || 0)) {
      hs[levelId] = score;
      this.set('highscores', hs);
    }
  },
};

window._SS.Storage = Storage;
