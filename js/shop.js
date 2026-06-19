/* shop.js — Shop economy, gold bars, purchase system — Phase 7 */

window._SS = window._SS || {};

const Shop = {
  /** Gold Bar packs (real money → gold bars) */
  GOLD_PACKS: [
    { id: 'gold_10', name: 'Pouch of Gold', amount: 10, price: 'RM 1.90', bonus: 0, tag: null },
    { id: 'gold_50', name: 'Chest of Gold', amount: 50, price: 'RM 7.90', bonus: 5, tag: 'Popular' },
    { id: 'gold_120', name: 'Vault of Gold', amount: 120, price: 'RM 14.90', bonus: 15, tag: 'Best Value' },
    { id: 'gold_300', name: 'Dragon Hoard', amount: 300, price: 'RM 34.90', bonus: 50, tag: null },
  ],

  /** Coin packs (gold bars → coins) */
  COIN_PACKS: [
    { id: 'coin_100', name: 'Coin Sack', amount: 100, cost: 5, icon: '💰' },
    { id: 'coin_250', name: 'Coin Purse', amount: 250, cost: 10, icon: '💰', tag: 'Popular' },
    { id: 'coin_600', name: 'Coin Chest', amount: 600, cost: 20, icon: '💰', tag: 'Best Value' },
  ],

  /** Booster packs (gold bars → boosters) */
  BOOSTER_PACKS: [
    { id: 'booster_moves_3', name: 'Moves Pack', type: 'moves', amount: 3, cost: 10, icon: '+3', desc: '+3 Extra Moves' },
    { id: 'booster_hammer_3', name: 'Hammer Pack', type: 'hammer', amount: 3, cost: 15, icon: '🍭', desc: '3 Lollipop Hammers' },
    { id: 'booster_bomb_3', name: 'Bomb Pack', type: 'bomb', amount: 3, cost: 20, icon: '💣', desc: '3 Color Bombs' },
  ],

  /** Bundles (gold bars → mixed items) */
  BUNDLES: [
    {
      id: 'starter_bundle',
      name: 'Starter Bundle',
      cost: 30,
      tag: 'New Player',
      items: [
        { type: 'booster', sub: 'moves', amount: 5 },
        { type: 'booster', sub: 'hammer', amount: 3 },
        { type: 'booster', sub: 'bomb', amount: 2 },
        { type: 'coins', amount: 100 },
      ],
      desc: '5 Moves · 3 Hammers · 2 Bombs · 100 Coins',
    },
    {
      id: 'pro_bundle',
      name: 'Pro Bundle',
      cost: 80,
      tag: 'Best Deal',
      items: [
        { type: 'booster', sub: 'moves', amount: 15 },
        { type: 'booster', sub: 'hammer', amount: 10 },
        { type: 'booster', sub: 'bomb', amount: 5 },
        { type: 'coins', amount: 500 },
        { type: 'goldbars', amount: 10 },
      ],
      desc: '15 Moves · 10 Hammers · 5 Bombs · 500 Coins · 10 Gold',
    },
  ],

  /* ---- Purchase Logic ---- */

  /** Simulate buying a gold pack (real money purchase) */
  buyGoldPack(packId) {
    var pack = this.GOLD_PACKS.find(function(p) { return p.id === packId; });
    if (!pack) return false;
    // Simulated purchase — in production this would call Stripe/Google Pay
    var total = pack.amount + (pack.bonus || 0);
    Storage.addGoldBars(total);
    return { pack: pack, total: total };
  },

  /** Buy item with gold bars */
  buyWithGold(item) {
    var gb = Storage.getGoldBars();
    if (gb < item.cost) return { success: false, reason: 'Not enough Gold Bars' };

    var newGB = Storage.spendGoldBars(item.cost);
    if (newGB === false) return { success: false, reason: 'Purchase failed' };

    // Apply items
    if (item.type === 'coins') {
      Storage.addCoins(item.amount);
    } else if (item.type === 'booster') {
      Storage.addBooster(item.sub, item.amount);
    } else if (item.type === 'goldbars') {
      Storage.addGoldBars(item.amount);
    }

    return { success: true, newGB: newGB };
  },

  /** Buy a bundle */
  buyBundle(bundleId) {
    var bundle = this.BUNDLES.find(function(b) { return b.id === bundleId; });
    if (!bundle) return { success: false, reason: 'Bundle not found' };
    return this.buyWithGold(bundle);
  },

  /** Buy a coin pack */
  buyCoinPack(packId) {
    var pack = this.COIN_PACKS.find(function(p) { return p.id === packId; });
    if (!pack) return { success: false, reason: 'Pack not found' };
    return this.buyWithGold({
      cost: pack.cost,
      type: 'coins',
      amount: pack.amount,
    });
  },

  /** Buy a booster pack */
  buyBoosterPack(packId) {
    var pack = this.BOOSTER_PACKS.find(function(p) { return p.id === packId; });
    if (!pack) return { success: false, reason: 'Pack not found' };
    return this.buyWithGold({
      cost: pack.cost,
      type: 'booster',
      sub: pack.type,
      amount: pack.amount,
    });
  },
};

window._SS.Shop = Shop;
