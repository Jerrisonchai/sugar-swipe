/* social.js — AI bots, leaderboard, gifts, friend feed — Phase 8 */

window._SS = window._SS || {};

const Social = {
  /** Bot definitions */
  BOTS: [
    {
      id: 'maya',
      name: 'Maya',
      emoji: '🌸',
      icon: '🌸',
      title: 'Friendly Rival',
      story: 'Maya is a cheerful candy enthusiast who loves a friendly competition. She runs a small bakery in Candy Meadow and always shares her sweet creations. She believes the best way to improve is to have fun together!',
      traits: ['Cheerful ☀️', 'Supportive 🤝', 'Bakery Owner 🧁'],
      scoreRange: [0.90, 1.10],
      giftChance: 0.4,
      giftTypes: ['life'],
    },
    {
      id: 'rex',
      name: 'Rex',
      emoji: '🦖',
      icon: '🦖',
      title: 'Aggressive Challenger',
      story: 'Rex is a retired gamer-turned-candy-crusher. He treats every level like a boss fight! He pushes everyone to be their best with tough love and high scores. Underneath the fierce exterior, he respects true skill.',
      traits: ['Competitive 🏆', 'Intense ⚡', 'Ex-Pro Gamer 🎮'],
      scoreRange: [1.10, 1.30],
      giftChance: 0.25,
      giftTypes: ['life', 'coins'],
    },
    {
      id: 'luna',
      name: 'Luna',
      emoji: '🌙',
      icon: '🌙',
      title: 'Casual Supporter',
      story: 'Luna is a night-owl artist who plays Sugar Swipe to unwind. She loves the beautiful candy designs and plays at her own pace. She always has a kind word and a thoughtful gift for her friends.',
      traits: ['Artistic 🎨', 'Kind 💜', 'Night Owl 🦉'],
      scoreRange: [0.70, 0.90],
      giftChance: 0.5,
      giftTypes: ['booster_moves', 'booster_hammer'],
    },
  ],

  GIFT_VALUES: {
    life: { amount: 1, icon: '❤️', label: '1 Life' },
    coins: { amount: 50, icon: '🪙', label: '50 Coins' },
    booster_moves: { amount: 1, icon: '+3', label: '1 Moves Booster' },
    booster_hammer: { amount: 1, icon: '🍭', label: '1 Hammer' },
  },

  MAX_SEND_PER_DAY: 3,
  SEND_GIFT_COST: 50,

  /* ---- Helpers ---- */
  _St() { return window._SS.Storage; },

  _getSocialData() {
    return this._St().get('social') || { gifts: {}, sentCount: 0, sendDate: '', activity: [], leaderboard: {} };
  },

  _saveSocialData(data) {
    this._St().set('social', data);
  },

  /* ---- Bot Score ---- */
  getBotScore(botId) {
    var data = this._getSocialData();
    if (!data.leaderboard) data.leaderboard = {};
    if (!data.leaderboard[botId]) {
      data.leaderboard[botId] = { weekly: 0, allTime: 0, weeklyStars: 0, allTimeStars: 0, lastUpdated: 0 };
    }
    return data.leaderboard[botId];
  },

  /** Update bot scores when player completes a level */
  onPlayerLevelComplete(playerScore, playerStars, levelId) {
    var data = this._getSocialData();
    if (!data.leaderboard) data.leaderboard = {};
    var lb = data.leaderboard;

    var playerTotal = 0, playerCount = 0;
    for (var key in lb) {
      if (lb[key].allTime > 0) { playerTotal += lb[key].allTime; playerCount++; }
    }
    var playerAvg = playerCount > 0 ? playerTotal / playerCount : playerScore;

    for (var i = 0; i < this.BOTS.length; i++) {
      var bot = this.BOTS[i];
      if (!lb[bot.id]) {
        lb[bot.id] = { weekly: 0, allTime: 0, weeklyStars: 0, allTimeStars: 0, lastUpdated: 0 };
      }
      var range = bot.scoreRange;
      var multiplier = range[0] + Math.random() * (range[1] - range[0]);
      var drift = 0.85 + Math.random() * 0.3;
      var botScore = Math.round(playerScore * multiplier * drift);
      var botStars = Math.min(3, Math.max(1, Math.round(playerStars * multiplier)));

      lb[bot.id].weekly += botScore;
      lb[bot.id].allTime += botScore;
      lb[bot.id].weeklyStars += botStars;
      lb[bot.id].allTimeStars += botStars;
      lb[bot.id].lastUpdated = Date.now();

      this._addActivity(bot.id, bot.name, bot.emoji,
        'completed Level ' + levelId + ' with ' + botScore.toLocaleString() + ' pts! ' + '⭐'.repeat(botStars));
    }

    this._addActivity('player', 'You', '👤',
      'completed Level ' + levelId + ' with ' + playerScore.toLocaleString() + ' pts! ' + '⭐'.repeat(playerStars));

    if (data.activity.length > 20) data.activity = data.activity.slice(-20);

    this._saveSocialData(data);
    this._maybeGenerateGifts();
  },

  _addActivity(userId, name, emoji, text) {
    var data = this._getSocialData();
    data.activity = data.activity || [];
    data.activity.push({ userId: userId, name: name, emoji: emoji, text: text, time: Date.now() });
    this._saveSocialData(data);
  },

  /* ---- Gifts ---- */
  getPendingGifts() {
    var data = this._getSocialData();
    var gifts = data.gifts || {};
    var pending = [];
    for (var i = 0; i < this.BOTS.length; i++) {
      var bot = this.BOTS[i];
      if (gifts[bot.id] && gifts[bot.id].length > 0) {
        pending.push({ botId: bot.id, bot: bot, gift: gifts[bot.id][0] });
      }
    }
    return pending;
  },

  /** Get total gift notification count */
  getGiftNotifyCount() {
    var data = this._getSocialData();
    var gifts = data.gifts || {};
    var count = 0;
    for (var botId in gifts) {
      count += (gifts[botId] || []).length;
    }
    return count;
  },

  _maybeGenerateGifts() {
    var data = this._getSocialData();
    var gifts = data.gifts || {};
    var today = new Date().toDateString();

    for (var i = 0; i < this.BOTS.length; i++) {
      var bot = this.BOTS[i];
      if (gifts[bot.id] && gifts[bot.id].length > 0) {
        var hasToday = false;
        for (var j = 0; j < gifts[bot.id].length; j++) {
          if (gifts[bot.id][j].date === today) { hasToday = true; break; }
        }
        if (hasToday) continue;
      }
      if (Math.random() < bot.giftChance) {
        if (!gifts[bot.id]) gifts[bot.id] = [];
        var types = bot.giftTypes;
        var type = types[Math.floor(Math.random() * types.length)];
        gifts[bot.id].push({ type: type, date: today, time: Date.now() });
        this._addActivity(bot.id, bot.name, bot.emoji,
          'sent you a gift: ' + (this.GIFT_VALUES[type] ? this.GIFT_VALUES[type].label : type) + '! 🎁');
      }
    }
    data.gifts = gifts;
    this._saveSocialData(data);
  },

  /** Accept a gift from a bot */
  acceptGift(botId) {
    var data = this._getSocialData();
    var gifts = data.gifts || {};
    if (!gifts[botId] || gifts[botId].length === 0) return null;
    var gift = gifts[botId].shift();
    data.gifts = gifts;
    this._saveSocialData(data);

    var gv = this.GIFT_VALUES[gift.type];
    if (!gv) return gift;

    var St = this._St();
    switch (gift.type) {
      case 'life':
        var livesData = St.get('lives');
        if (!livesData) livesData = { lives: St.MAX_LIVES, lastRegenTime: Date.now() };
        livesData.lives = Math.min(St.MAX_LIVES, (livesData.lives || St.MAX_LIVES) + gv.amount);
        St.set('lives', livesData);
        break;
      case 'coins':
        St.addCoins(gv.amount);
        break;
      case 'booster_moves':
        St.addBooster('moves', gv.amount);
        break;
      case 'booster_hammer':
        St.addBooster('hammer', gv.amount);
        break;
    }

    return { botId: botId, type: gift.type, value: gv };
  },

  /** Send a gift to a bot (costs coins) */
  sendGiftToBot(botId) {
    var data = this._getSocialData();
    var today = new Date().toDateString();
    if (data.sendDate !== today) { data.sentCount = 0; data.sendDate = today; }
    if (data.sentCount >= this.MAX_SEND_PER_DAY) {
      return { success: false, reason: 'Max ' + this.MAX_SEND_PER_DAY + ' gifts per day' };
    }
    if (!this._St().spendCoins(this.SEND_GIFT_COST)) {
      return { success: false, reason: 'Not enough coins (need ' + this.SEND_GIFT_COST + ')' };
    }
    data.sentCount++;
    this._saveSocialData(data);

    var bot = null;
    for (var i = 0; i < this.BOTS.length; i++) {
      if (this.BOTS[i].id === botId) { bot = this.BOTS[i]; break; }
    }
    var returned = Math.random() < 0.3;
    if (returned) this._maybeGenerateGifts();
    this._addActivity('player', 'You', '👤', 'sent ' + (bot ? bot.name : 'friend') + ' a gift! ❤️');
    return { success: true, sentCount: data.sentCount, botReplied: returned };
  },

  /* ---- Leaderboard ---- */
  getLeaderboard(period) {
    var data = this._getSocialData();
    if (!data.leaderboard) data.leaderboard = {};
    var lb = data.leaderboard;
    var St = this._St();

    var pWeeklyScore = 0, pAllTimeScore = 0, pWeeklyStars = 0, pAllTimeStars = 0;
    var levelsCompleted = 0;
    var progress = St.get('progress') || {};
    var highscores = St.get('highscores') || {};

    for (var key in progress) {
      if (progress[key] > 0) { pAllTimeStars += progress[key]; pWeeklyStars += progress[key]; levelsCompleted++; }
    }
    for (var k in highscores) { pAllTimeScore += highscores[k]; pWeeklyScore += highscores[k]; }

    var unlockedWorld = St.getUnlockedWorld ? St.getUnlockedWorld() : 1;
    var worldNames = ['', 'Candy Meadow', 'Frosted Peaks', 'Chocolate Swamp', 'Licorice Lab', 'Marmalade Manor', 'Rainbow Summit'];
    var currentWorld = worldNames[Math.min(unlockedWorld, 6)] || 'Candy Meadow';

    var entries = [{
      id: 'player', name: 'You', emoji: '👤',
      score: period === 'weekly' ? pWeeklyScore : pAllTimeScore,
      stars: period === 'weekly' ? pWeeklyStars : pAllTimeStars,
      world: currentWorld, levelsCompleted: levelsCompleted, totalLevels: 60, isPlayer: true,
    }];

    for (var i = 0; i < this.BOTS.length; i++) {
      var bot = this.BOTS[i];
      if (!lb[bot.id]) lb[bot.id] = { weekly: 0, allTime: 0, weeklyStars: 0, allTimeStars: 0 };
      var bd = lb[bot.id];
      if (bd.allTime === 0) {
        var seedScore = 5000 + Math.floor(Math.random() * 20000);
        bd.allTime = seedScore;
        bd.allTimeStars = Math.floor(seedScore / 2000);
        bd.weekly = Math.floor(seedScore * 0.3);
        bd.weeklyStars = Math.floor(bd.allTimeStars * 0.3);
      }
      var botStars = period === 'weekly' ? bd.weeklyStars : bd.allTimeStars;
      var botWorld = worldNames[1];
      var thresh = [0, 0, 10, 20, 30, 40, 50];
      for (var w = 1; w <= 6; w++) { if (botStars >= thresh[w]) botWorld = worldNames[w]; }
      var botLevels = Math.min(60, Math.floor(botStars / 1.5));

      entries.push({
        id: bot.id, name: bot.name, emoji: bot.emoji,
        score: period === 'weekly' ? bd.weekly : bd.allTime,
        stars: botStars, world: botWorld,
        levelsCompleted: Math.max(1, botLevels), totalLevels: 60, isPlayer: false,
      });
    }

    entries.sort(function(a, b) { return b.score - a.score; });
    for (var j = 0; j < entries.length; j++) entries[j].rank = j + 1;
    this._saveSocialData(data);
    return entries;
  },

  /* ---- Feed ---- */
  getFeed(limit) {
    var data = this._getSocialData();
    var activities = (data.activity || []).slice();
    activities.reverse();
    if (limit) activities = activities.slice(0, limit);
    return activities;
  },

  /** Weekly reset on Monday */
  checkWeeklyReset() {
    var data = this._getSocialData();
    var now = new Date();
    if (now.getDay() !== 1) return;
    var today = now.toDateString();
    if (data.lastWeeklyReset === today) return;
    if (!data.leaderboard) data.leaderboard = {};
    for (var key in data.leaderboard) {
      data.leaderboard[key].weekly = 0;
      data.leaderboard[key].weeklyStars = 0;
    }
    data.lastWeeklyReset = today;
    this._saveSocialData(data);
  },
};

window._SS.Social = Social;
