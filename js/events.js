/* events.js — Daily Spin, Weekly Challenges, Streak Bonuses — Phase 9 */

window._SS = window._SS || {};

const EventManager = {
  /* ---- Spin Wheel Rewards (8 segments) ---- */
  SPIN_REWARDS: [
    { id: 'coins50',  icon: '🪙', label: '50 Coins',    type: 'coins', amount: 50,  weight: 3 },
    { id: 'life1',   icon: '❤️', label: '+1 Life',     type: 'life',  amount: 1,   weight: 3 },
    { id: 'hammer1', icon: '🍭', label: '1 Hammer',    type: 'booster_hammer', amount: 1, weight: 2 },
    { id: 'coins100',icon: '🪙', label: '100 Coins',   type: 'coins', amount: 100, weight: 3 },
    { id: 'moves1',  icon: '+3', label: '1 +3 Moves',  type: 'booster_moves', amount: 1, weight: 2 },
    { id: 'coins200',icon: '🪙', label: '200 Coins',   type: 'coins', amount: 200, weight: 1 },
    { id: 'bomb1',   icon: '💣', label: '1 Bomb',      type: 'booster_bomb', amount: 1, weight: 1 },
    { id: 'mystery', icon: '🎁', label: 'Mystery Box', type: 'mystery', amount: 1, weight: 1 },
  ],

  /* ---- Weekly Challenge Pool ---- */
  CHALLENGE_POOL: [
    { id: 'levels5',   desc: 'Complete 5 levels',        track: 'levelsCompleted', target: 5,  reward: { coins: 200 } },
    { id: 'stars10',   desc: 'Earn 10 stars',            track: 'starsEarned',     target: 10, reward: { booster_moves: 2 } },
    { id: 'specials20',desc: 'Create 20 special candies',track: 'specialsCreated', target: 20, reward: { booster_bomb: 1, coins: 100 } },
    { id: 'obstacles50',desc:'Destroy 50 obstacles',     track: 'obstaclesCleared',target: 50, reward: { booster_hammer: 2, coins: 100 } },
    { id: 'score50k',  desc: 'Score 50,000 pts total',   track: 'totalScore',      target: 50000, reward: { booster_hammer: 1, booster_moves: 1, booster_bomb: 1 } },
    { id: 'world2_3',  desc: 'Beat 3 levels in World 2+',track: 'world2plusLevels',target: 3,  reward: { coins: 300 } },
    { id: 'use3boost', desc: 'Use 3 boosters',          track: 'boostersUsed',     target: 3,  reward: { booster_hammer: 1 } },
    { id: 'ice30',     desc: 'Break 30 ice blocks',      track: 'iceCleared',      target: 30, reward: { booster_moves: 2 } },
    { id: 'jelly20',   desc: 'Clear 20 jelly tiles',     track: 'jellyCleared',    target: 20, reward: { coins: 200 } },
    { id: 'candies100',desc: 'Match 100 candies',        track: 'candiesMatched',  target: 100, reward: { booster_bomb: 1 } },
  ],

  /* ---- Streak Rewards ---- */
  STREAK_REWARDS: [
    { day: 1, icon: '🪙', label: '50 Coins', desc: 'Day 1 Bonus',    reward: { coins: 50 } },
    { day: 2, icon: '🍭', label: '1 Hammer', desc: 'Day 2 Streak',   reward: { booster_hammer: 1 } },
    { day: 3, icon: '🪙', label: '100 Coins', desc: 'Day 3 Heat',    reward: { coins: 100 } },
    { day: 4, icon: '+3', label: '1 +3 Moves', desc: 'Day 4 Power',  reward: { booster_moves: 1 } },
    { day: 5, icon: '💣', label: 'Bomb + 200🪙', desc: 'Day 5 Blast', reward: { booster_bomb: 1, coins: 200 } },
    { day: 6, icon: '🪙', label: '300 Coins', desc: 'Day 6 Fortune',  reward: { coins: 300 } },
    { day: 7, icon: '🎁', label: 'Mega Box', desc: 'Day 7 Jackpot!',  reward: { booster_hammer: 2, booster_moves: 2, booster_bomb: 2, coins: 500 } },
  ],

  /* ---- Helpers ---- */
  _St() { return window._SS.Storage; },

  _getData() {
    return this._St().get('events') || { lastSpinDate: '', challenges: {}, streak: {} };
  },

  _saveData(d) { this._St().set('events', d); },

  /** Check if today's spin is available */
  canSpinToday() {
    var d = this._getData();
    return d.lastSpinDate !== new Date().toDateString();
  },

  /** Perform the spin → returns the reward */
  doSpin() {
    var d = this._getData();
    var today = new Date().toDateString();
    if (d.lastSpinDate === today) return null; // already spun today

    // Weighted random pick
    var pool = [];
    for (var i = 0; i < this.SPIN_REWARDS.length; i++) {
      for (var j = 0; j < this.SPIN_REWARDS[i].weight; j++) pool.push(i);
    }
    var idx = pool[Math.floor(Math.random() * pool.length)];
    var reward = this.SPIN_REWARDS[idx];

    d.lastSpinDate = today;
    this._saveData(d);

    // Grant reward
    this._grantReward(reward);
    return { index: idx, reward: reward };
  },

  /** Get which segment the wheel lands on (for display) */
  getSpinTarget() {
    var pool = [];
    for (var i = 0; i < this.SPIN_REWARDS.length; i++) {
      for (var j = 0; j < this.SPIN_REWARDS[i].weight; j++) pool.push(i);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  },

  /** Get this week's Monday date string */
  _getWeekMonday() {
    var now = new Date();
    var day = now.getDay();
    var diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust Sunday
    var mon = new Date(now.setDate(diff));
    return mon.toDateString();
  },

  /** Get/init weekly challenges */
  getChallenges() {
    var d = this._getData();
    var mon = this._getWeekMonday();
    if (!d.challenges || !d.challenges.week || d.challenges.week !== mon) {
      // New week — reset weekly totals + pick 3 new challenges
      d.weeklyTotals = { stars: 0, score: 0, candies: 0, levels: 0, worlds2plus: 0, specials: 0, obstacles: 0, boosters: 0 };
      var pool = this.CHALLENGE_POOL.slice();
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      d.challenges = {
        week: mon,
        items: pool.slice(0, 3),
        progress: [0, 0, 0],
        claimed: [false, false, false],
      };
      this._saveData(d);
    }
    if (!d.weeklyTotals) d.weeklyTotals = { stars: 0, score: 0, candies: 0, levels: 0, worlds2plus: 0, specials: 0, obstacles: 0, boosters: 0 };
    return d.challenges;
  },

  /** Get weekly accumulated totals (for leaderboard sync) */
  getWeeklyTotals() {
    this.getChallenges(); // ensure week is set
    var d = this._getData();
    return d.weeklyTotals || { stars: 0, score: 0, candies: 0, levels: 0, worlds2plus: 0, specials: 0, obstacles: 0, boosters: 0 };
  },

  /** Record a level completion into weekly accumulator + challenge progress */
  recordLevelComplete(result) {
    if (!result) return;
    try {
    this.getChallenges(); // ensure week + weeklyTotals init
    var d = this._getData(); // re-fetch after getChallenges (which may have saved)
    if (!d.weeklyTotals) d.weeklyTotals = { stars: 0, score: 0, candies: 0, levels: 0, worlds2plus: 0, specials: 0, obstacles: 0, boosters: 0 };

    // Accumulate weekly totals
    d.weeklyTotals.stars += (result.stars || 0);
    d.weeklyTotals.score += (result.score || 0);
    d.weeklyTotals.candies += (result.candiesMatched || 0);
    d.weeklyTotals.levels += 1;
    d.weeklyTotals.specials += (result.specialsCreated || 0);
    d.weeklyTotals.obstacles += (result.obstaclesCleared || 0);
    if ((result.world || 1) >= 2) d.weeklyTotals.worlds2plus += 1;

    this._saveData(d);

    // Now update challenge progress from weekly totals
    var ch = d.challenges;
    var totals = d.weeklyTotals;
    var mapping = {
      'levelsCompleted': totals.levels,
      'starsEarned': totals.stars,
      'specialsCreated': totals.specials,
      'obstaclesCleared': totals.obstacles,
      'totalScore': totals.score,
      'world2plusLevels': totals.worlds2plus,
      'boostersUsed': totals.boosters,
      'iceCleared': totals.obstacles,
      'jellyCleared': totals.obstacles,
      'candiesMatched': totals.candies,
    };

    for (var i = 0; i < ch.items.length; i++) {
      var trackType = ch.items[i].track;
      if (!ch.claimed[i] && mapping[trackType] !== undefined) {
        ch.progress[i] = Math.min(ch.items[i].target, mapping[trackType]);
      }
    }
    d.challenges = ch;
    this._saveData(d);
    } catch(e) { console.warn('recordLevelComplete failed:', e); }
  },

  /** Track booster usage (separate from level complete) */
  trackBoosterUsed() {
    var d = this._getData();
    this.getChallenges();
    if (!d.weeklyTotals) d.weeklyTotals = { stars: 0, score: 0, candies: 0, levels: 0, worlds2plus: 0, specials: 0, obstacles: 0, boosters: 0 };
    d.weeklyTotals.boosters += 1;
    this._saveData(d);
    // Sync challenge progress
    var ch = d.challenges;
    for (var i = 0; i < ch.items.length; i++) {
      if (ch.items[i].track === 'boostersUsed' && !ch.claimed[i]) {
        ch.progress[i] = Math.min(ch.items[i].target, d.weeklyTotals.boosters);
      }
    }
    d.challenges = ch;
    this._saveData(d);
  },

  /** Claim a completed challenge */
  claimChallenge(index) {
    var d = this._getData();
    var ch = d.challenges;
    if (!ch.items || !ch.items[index]) return null;
    if (ch.claimed[index]) return null;
    if ((ch.progress[index] || 0) < ch.items[index].target) return null;

    ch.claimed[index] = true;
    d.challenges = ch;
    this._saveData(d);

    var reward = ch.items[index].reward;
    this._grantRewardObj(reward);
    return { challenge: ch.items[index], reward: reward };
  },

  /** Check if any challenge is completable (for badge) */
  hasCompletableChallenge() {
    try {
      var ch = this.getChallenges();
      if (!ch || !ch.items) return false;
      for (var i = 0; i < ch.items.length; i++) {
        if (!ch.claimed[i] && (ch.progress[i] || 0) >= ch.items[i].target) return true;
      }
    } catch(e) { return false; }
    return false;
  },

  /** Get streak data */
  getStreak() {
    var d = this._getData();
    var today = new Date().toDateString();
    if (!d.streak) d.streak = { current: 1, lastClaimDate: '', claimed: {} };
    var s = d.streak;
    if (!s.claimed) s.claimed = {};
    if (s.current > 7) s.current = 1; // wrap after 7

    var yesterday = new Date(Date.now() - 86400000).toDateString();
    if (s.lastClaimDate !== today && s.lastClaimDate !== yesterday) {
      // Missed a day — reset
      s.current = 1;
      s.claimed = {};
    }
    return s;
  },

  /** Can claim today's streak? */
  canClaimStreak() {
    var s = this.getStreak();
    var today = new Date().toDateString();
    return s.lastClaimDate !== today && !s.claimed[s.current];
  },

  /** Claim today's streak reward */
  claimStreak() {
    var d = this._getData();
    var today = new Date().toDateString();
    // Use getStreak() to get properly initialized streak data
    var s = this.getStreak();

    if (s.lastClaimDate === today) return null; // already claimed today
    if (s.claimed[s.current]) return null; // current day already claimed

    var dayIdx = s.current - 1;
    s.claimed[s.current] = true;
    s.lastClaimDate = today;
    d.streak = s;
    this._saveData(d);

    var reward = this.STREAK_REWARDS[dayIdx];
    this._grantRewardObj(reward.reward);

    // Advance streak (capped at 7, wraps)
    s.current = (s.current % 7) + 1;
    d.streak = s;
    this._saveData(d);

    return { day: dayIdx + 1, reward: reward };
  },

  /** Check notification count for events badge */
  getNotificationCount() {
    var count = 0;
    if (this.canSpinToday()) count++;
    if (this.canClaimStreak()) count++;
    if (this.hasCompletableChallenge()) count++;
    return count;
  },

  /* ---- Grant rewards (internal) ---- */
  _grantReward(r) {
    var St = this._St();
    switch (r.type) {
      case 'coins': St.addCoins(r.amount); break;
      case 'life':
        var d = St.get('lives') || { lives: St.MAX_LIVES, lastRegenTime: Date.now() };
        d.lives = Math.min(St.MAX_LIVES, (d.lives || St.MAX_LIVES) + r.amount);
        St.set('lives', d);
        break;
      case 'booster_hammer': St.addBooster('hammer', r.amount); break;
      case 'booster_moves': St.addBooster('moves', r.amount); break;
      case 'booster_bomb': St.addBooster('bomb', r.amount); break;
      case 'mystery':
        // Random big reward
        var opts = [
          function() { St.addCoins(500); },
          function() { St.addBooster('bomb', 2); St.addBooster('hammer', 2); },
          function() { St.addCoins(300); St.addBooster('moves', 2); },
          function() { St.addBooster('hammer', 1); St.addBooster('moves', 1); St.addBooster('bomb', 1); St.addCoins(200); },
        ];
        opts[Math.floor(Math.random() * opts.length)]();
        break;
    }
  },

  _grantRewardObj(obj) {
    var St = this._St();
    if (obj.coins) St.addCoins(obj.coins);
    if (obj.booster_hammer) St.addBooster('hammer', obj.booster_hammer);
    if (obj.booster_moves) St.addBooster('moves', obj.booster_moves);
    if (obj.booster_bomb) St.addBooster('bomb', obj.booster_bomb);
  },
};

window._SS.EventManager = EventManager;
