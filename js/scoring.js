/* scoring.js — Points & combo system for Sugar Swipe */

window._SS = window._SS || {};

const Scoring = {
  /* Base points per match size */
  MATCH_POINTS: { 3: 100, 4: 200, 5: 400, 6: 600, 7: 800, 8: 1000 },

  /* Chain multiplier: 1x for first, 1.5x for second, 2x for third+ */
  chainMultiplier(chainIndex) {
    if (chainIndex === 0) return 1;
    if (chainIndex === 1) return 1.5;
    return 2.0;
  },

  /* Combo names */
  comboName(chainIndex) {
    const names = ['', 'Sweet!', 'Tasty!', 'Delicious!', 'Sugar Rush!', 'Candy Storm!'];
    return names[Math.min(chainIndex, names.length - 1)];
  },

  /* Calculate points for a single match group */
  calcMatchPoints(matchSize, chainIndex) {
    const base = this.MATCH_POINTS[matchSize] || (matchSize * 80);
    return Math.round(base * this.chainMultiplier(chainIndex));
  },

  /* Calculate total points for all match groups in a chain */
  calcChainPoints(matchGroups, chainIndex) {
    let total = 0;
    for (const group of matchGroups) {
      total += this.calcMatchPoints(group.cells.length, chainIndex);
    }
    return total;
  },

  /* Star rating based on score vs level target */
  calcStars(score, target1Star, target2Star, target3Star) {
    if (score >= target3Star) return 3;
    if (score >= target2Star) return 2;
    if (score >= target1Star) return 1;
    return 0;
  },
};

window._SS.Scoring = Scoring;
