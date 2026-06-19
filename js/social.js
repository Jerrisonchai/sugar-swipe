/* social.js — AI bots, leaderboard, gifts, friend feed — Phase 8 */

window._SS = window._SS || {};

const Social = {
  /** Bot definitions */
  BOTS: [
    {
      id: 'maya',
      name: 'Maya',
      emoji: '🌸',
      title: 'Friendly Rival',
      personality: 'Scores 90-110% of your average. Sends lives daily.',
      scoreRange: [0.90, 1.10],
      giftChance: 0.4,      // 40% chance to have a gift waiting
      giftTypes: ['life'],
    },
    {
      id: 'rex',
      name: 'Rex',
      emoji: '🦖',
      title: 'Aggressive Challenger',
      personality: 'Scores 110-130% of your best. Challenges every 3 days.',
      scoreRange: [1.10, 1.30],
      giftChance: 0.25,
      giftTypes: ['life', 'coins'],
    },
    {
      id: 'luna',
      name: 'Luna',
      emoji: '🌙',
      title: 'Casual Supporter',
      personality: 'Scores 70-90% of your average. Sends gift boosters.',
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

  /** Gifts sent per day limit (for player → bot) */
  MAX_SEND_PER_DAY: 3,
  SEND_GIFT_COST: 50, // coins

  /** ---- Data ---- */
  _getSocialData() {
    return Storage.get('social') || { gifts: {}, sentCount: 0, sendDate: '', activity: [], leaderboard: {} };
  },

  _saveSocialData(data) {
    Storage.set('social', data);
  },

  /** ---- Bot Score Simulation ---- */
  getBotScore(botId) {
    var data = this._getSocialData();
    var lb = data.leaderboard || {};
    if (!lb[botId]) {
      lb[botId] = { weekly: 0, allTime: 0, weeklyStars: 0, allTimeStars: 0, lastUpdated: 0 };
    }
    return lb[botId];
  },

  /** Update bot scores when player completes a level */
  onPlayerLevelComplete(playerScore, playerStars, levelId) {
    var data = this._getSocialData();
    var lb = data.leaderboard || {};

    // Calculate player's average/best for bot scaling
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
      var drift = 0.85 + Math.random() * 0.3; // ±15% drift
      var botScore = Math.round(playerScore * multiplier * drift);
      var botStars = Math.min(3, Math.max(1, Math.round(playerStars * multiplier)));

      lb[bot.id].weekly += botScore;
      lb[bot.id].allTime += botScore;
      lb[bot.id].weeklyStars += botStars;
      lb[bot.id].allTimeStars += botStars;
      lb[bot.id].lastUpdated = Date.now();

      // Add bot activity to feed
      this._addActivity(bot.id, bot.name, bot.emoji,
        'completed Level ' + levelId + ' with ' + botScore.toLocaleString() + ' pts! ' + '⭐'.repeat(botStars));
    }

    // Also add player activity
    this._addActivity('player', 'You', '👤',
      'completed Level ' + levelId + ' with ' + playerScore.toLocaleString() + ' pts! ' + '⭐'.repeat(playerStars));

    // Clean old activities (keep 20)
    if (data.activity.length > 20) {
      data.activity = data.activity.slice(-20);
    }

    data.leaderboard = lb;
    this._saveSocialData(data);

    // Check for gifts
    this._maybeGenerateGifts();
  },

  _addActivity(userId, name, emoji, text) {
    var data = this._getSocialData();
    data.activity = data.activity || [];
    data.activity.push({
      userId: userId,
      name: name,
      emoji: emoji,
      text: text,
      time: Date.now(),
    });
    this._saveSocialData(data);
  },

  /** ---- Gifts ---- */

  /** Check if any bots have gifts waiting */
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

  /** Generate random gifts from bots */
  _maybeGenerateGifts() {
    var data = this._getSocialData();
    var gifts = data.gifts || {};
    var today = new Date().toDateString();

    for (var i = 0; i < this.BOTS.length; i++) {
      var bot = this.BOTS[i];

      // Check if bot already gifted today
      if (gifts[bot.id] && gifts[bot.id].length > 0) {
        // Check if there's a gift from today
        var hasTodayGift = false;
        for (var j = 0; j < gifts[bot.id].length; j++) {
          if (gifts[bot.id][j].date === today) {
            hasTodayGift = true;
            break;
          }
        }
        if (hasTodayGift) continue;
      }

      // Random chance
      if (Math.random() < bot.giftChance) {
        if (!gifts[bot.id]) gifts[bot.id] = [];
        var giftTypes = bot.giftTypes;
        var type = giftTypes[Math.floor(Math.random() * giftTypes.length)];
        gifts[bot.id].push({ type: type, date: today, time: Date.now() });
        this._addActivity(bot.id, bot.name, bot.emoji,
          'sent you a gift: ' + (this.GIFT_VALUES[type] ? this.GIFT_VALUES[type].label : type) + '!');
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

    // Apply the gift
    var gv = this.GIFT_VALUES[gift.type];
    if (!gv) return gift;

    switch (gift.type) {
      case 'life':
        var d = Storage.get('lives') ? (JSON.parse(JSON.stringify(Storage._getLivesData ? Storage._getLivesData() : { lives: 3, lastRegenTime: Date.now() }))) : { lives: 3, lastRegenTime: Date.now() };
        d.lives = Math.min(Storage.MAX_LIVES, d.lives + gv.amount);
        Storage.set('lives', d);
        break;
      case 'coins':
        Storage.addCoins(gv.amount);
        break;
      case 'booster_moves':
        Storage.addBooster('moves', gv.amount);
        break;
      case 'booster_hammer':
        Storage.addBooster('hammer', gv.amount);
        break;
    }

    return { botId: botId, type: gift.type, value: gv };
  },

  /** Send a gift to a bot (costs coins) */
  sendGiftToBot(botId) {
    var data = this._getSocialData();
    var today = new Date().toDateString();

    // Reset daily count if new day
    if (data.sendDate !== today) {
      data.sentCount = 0;
      data.sendDate = today;
    }

    if (data.sentCount >= this.MAX_SEND_PER_DAY) {
      return { success: false, reason: 'Max ' + this.MAX_SEND_PER_DAY + ' gifts per day' };
    }

    if (!Storage.spendCoins(this.SEND_GIFT_COST)) {
      return { success: false, reason: 'Not enough coins (need ' + this.SEND_GIFT_COST + ')' };
    }

    data.sentCount++;
    this._saveSocialData(data);

    var bot = this.BOTS.find(function(b) { return b.id === botId; });
    // Bot might send a gift back (30% chance)
    var returned = Math.random() < 0.3;
    if (returned) {
      this._maybeGenerateGifts();
    }

    this._addActivity('player', 'You', '👤', 'sent ' + (bot ? bot.name : 'bot') + ' a gift! ❤️');

    return { success: true, sentCount: data.sentCount, botReplied: returned };
  },

  /** ---- Leaderboard ---- */
  getLeaderboard(period) {
    // period = 'weekly' | 'allTime'
    var data = this._getSocialData();
    var lb = data.leaderboard || {};
    var Storage = window._SS.Storage;

    // Get player stats
    var playerWeeklyScore = 0, playerAllTimeScore = 0, playerWeeklyStars = 0, playerAllTimeStars = 0;
    var progress = Storage.get('progress') || {};
    var highscores = Storage.get('highscores') || {};

    for (var key in progress) {
      if (progress[key] > 0) {
        playerAllTimeStars += progress[key];
        playerWeeklyStars += progress[key]; // same for now (local only)
      }
    }
    for (var key in highscores) {
      playerAllTimeScore += highscores[key];
      playerWeeklyScore += highscores[key];
    }

    var entries = [{
      id: 'player',
      name: 'You',
      emoji: '👤',
      score: period === 'weekly' ? playerWeeklyScore : playerAllTimeScore,
      stars: period === 'weekly' ? playerWeeklyStars : playerAllTimeStars,
      isPlayer: true,
    }];

    for (var i = 0; i < this.BOTS.length; i++) {
      var bot = this.BOTS[i];
      var botData = lb[bot.id] || { weekly: 0, allTime: 0, weeklyStars: 0, allTimeStars: 0 };
      // If first time, seed with some scores
      if (botData.allTime === 0) {
        var seedScore = 5000 + Math.floor(Math.random() * 20000);
        botData.allTime = seedScore;
        botData.allTimeStars = Math.floor(seedScore / 2000);
        botData.weekly = Math.floor(seedScore * 0.3);
        botData.weeklyStars = Math.floor(botData.allTimeStars * 0.3);
        if (!lb[bot.id]) lb[bot.id] = botData;
      }

      entries.push({
        id: bot.id,
        name: bot.name,
        emoji: bot.emoji,
        score: period === 'weekly' ? botData.weekly : botData.allTime,
        stars: period === 'weekly' ? botData.weeklyStars : botData.allTimeStars,
        isPlayer: false,
      });
    }

    // Sort by score descending
    entries.sort(function(a, b) { return b.score - a.score; });

    // Add rank
    for (var j = 0; j < entries.length; j++) {
      entries[j].rank = j + 1;
    }

    this._saveSocialData(data);

    return entries;
  },

  /** ---- Feed ---- */
  getFeed(limit) {
    var data = this._getSocialData();
    var activities = (data.activity || []).slice();
    activities.reverse();
    if (limit) activities = activities.slice(0, limit);
    return activities;
  },

  /** ---- Weekly Reset ---- */
  checkWeeklyReset() {
    var data = this._getSocialData();
    var now = new Date();
    // Reset if Monday
    if (now.getDay() === 1) {
      var lastReset = data.lastWeeklyReset || '';
      var today = now.toDateString();
      if (lastReset !== today) {
        var lb = data.leaderboard || {};
        for (var key in lb) {
          lb[key].weekly = 0;
          lb[key].weeklyStars = 0;
        }
        data.lastWeeklyReset = today;
        data.leaderboard = lb;
        this._saveSocialData(data);
      }
    }
  },
};

/** Shortcut from storage */
var Storage = window._SS.Storage;

window._SS.Social = Social;
