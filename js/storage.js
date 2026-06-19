/* storage.js — LocalStorage persistence for Sugar Swipe — Phase 6 */

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
  /** Return highest unlocked world number (1-6) */
  getUnlockedWorld() {
    var progress = this.get('progress') || {};
    var maxWorld = 1;
    for (var key in progress) {
      if (progress[key] > 0) {
        var lvl = parseInt(key, 10);
        if (!isNaN(lvl)) {
          var world = Math.ceil(lvl / 10);
          if (world > maxWorld) maxWorld = world;
        }
      }
    }
    // Check if world 2 is unlocked via progress
    if (maxWorld >= 2 || progress['10']) return Math.min(6, maxWorld);
    // Check world progress array
    var wProg = this.get('worldProgress') || [true, false, false, false, false, false];
    for (var w = 5; w >= 0; w--) {
      if (wProg[w]) return w + 1;
    }
    return 1;
  },

  /** Get social gift notification count */
  getGiftNotifyCount() {
    var social = this.get('social');
    if (!social || !social.gifts) return 0;
    var count = 0;
    for (var botId in social.gifts) {
      if (social.gifts[botId] && social.gifts[botId].length) {
        count += social.gifts[botId].length;
      }
    }
    return count;
  },


  /* ---- Progress ---- */
  getLevelStars(levelId) {
    const p = this.get('progress') || {};
    return p[levelId] || 0;
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
    var hs = this.get('highscores') || {};
    if (score > (hs[levelId] || 0)) {
      hs[levelId] = score;
      this.set('highscores', hs);
    }
  },

  /* ===== LIVES ===== */
  MAX_LIVES: 5,
  REGEN_MINUTES: 20,

  _getLivesData() {
    return this.get('lives') || { lives: this.MAX_LIVES, lastRegenTime: Date.now() };
  },

  _saveLivesData(data) {
    this.set('lives', data);
  },

  /** Get current lives count, applying regen */
  getLives() {
    var d = this._getLivesData();
    if (d.lives >= this.MAX_LIVES) {
      d.lastRegenTime = Date.now();
      return d.lives;
    }
    var elapsedMs = Date.now() - d.lastRegenTime;
    var regenCount = Math.floor(elapsedMs / (this.REGEN_MINUTES * 60 * 1000));
    if (regenCount > 0) {
      d.lives = Math.min(this.MAX_LIVES, d.lives + regenCount);
      d.lastRegenTime = Date.now();
      this._saveLivesData(d);
    }
    return d.lives;
  },

  /** Consume one life, returns new count */
  consumeLife() {
    var lives = this.getLives();
    if (lives <= 0) return 0;
    var d = this._getLivesData();
    d.lives = Math.max(0, d.lives - 1);
    d.lastRegenTime = Date.now(); // reset timer on consumption
    this._saveLivesData(d);
    return d.lives;
  },

  /** Seconds until next life regen */
  secondsUntilNextLife() {
    var d = this._getLivesData();
    if (d.lives >= this.MAX_LIVES) return 0;
    var elapsed = (Date.now() - d.lastRegenTime) / 1000;
    var regenSec = this.REGEN_MINUTES * 60;
    var remaining = regenSec - (elapsed % regenSec);
    return Math.max(0, Math.ceil(remaining));
  },

  /* ===== COINS ===== */
  getCoins() {
    return this.get('coins') || 0;
  },

  addCoins(amount) {
    var coins = this.getCoins() + amount;
    this.set('coins', coins);
    return coins;
  },

  spendCoins(amount) {
    var coins = this.getCoins();
    if (coins < amount) return false;
    coins -= amount;
    this.set('coins', coins);
    return coins;
  },

  /* ===== GOLD BARS (premium) ===== */
  getGoldBars() {
    return this.get('goldbars') || 0;
  },

  addGoldBars(amount) {
    var gb = this.getGoldBars() + amount;
    this.set('goldbars', gb);
    return gb;
  },

  spendGoldBars(amount) {
    var gb = this.getGoldBars();
    if (gb < amount) return false;
    gb -= amount;
    this.set('goldbars', gb);
    return gb;
  },

  /* ===== BOOSTERS ===== */
  _getBoosters() {
    return this.get('boosters') || { moves: 2, hammer: 3, bomb: 1 };
  },

  getBoosterCount(type) {
    return this._getBoosters()[type] || 0;
  },

  useBooster(type) {
    var b = this._getBoosters();
    if (!b[type] || b[type] <= 0) return false;
    b[type]--;
    this.set('boosters', b);
    return true;
  },

  addBooster(type, amount) {
    var b = this._getBoosters();
    b[type] = (b[type] || 0) + amount;
    this.set('boosters', b);
  },

  /* ===== ADMIN ===== */
  /** Called by admin toggle — save current progress snapshot */
  saveAdminSnapshot() {
    this.set('admin_save', {
      progress: JSON.parse(JSON.stringify(this.get('progress') || {})),
      unlocked_world: this.getUnlockedWorld(),
      lives: JSON.parse(JSON.stringify(this._getLivesData())),
      coins: this.getCoins(),
      goldbars: this.getGoldBars(),
      boosters: JSON.parse(JSON.stringify(this._getBoosters())),
      social_friendship: JSON.parse(JSON.stringify((this.get('social') || {}).friendship || {})),
    });
  },

  /** Called by admin toggle — restore original progress */
  restoreAdminSnapshot() {
    var save = this.get('admin_save');
    if (!save) return;
    this.set('progress', save.progress || {});
    this.set('unlocked_world', save.unlocked_world || 1);
    this.set('lives', save.lives || { lives: this.MAX_LIVES, lastRegenTime: Date.now() });
    this.set('coins', save.coins || 0);
    this.set('goldbars', save.goldbars || 0);
    this.set('boosters', save.boosters || { moves: 2, hammer: 3, bomb: 1 });
    // Restore friendship levels
    if (save.social_friendship) {
      var social = this.get('social') || {};
      social.friendship = save.social_friendship;
      this.set('social', social);
    }
    this.remove('admin_save');
  },

  /** Check if admin mode is active */
  isAdminMode() {
    return !!this.get('admin_save');
  },
};

window._SS.Storage = Storage;
