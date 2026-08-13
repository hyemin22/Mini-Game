// Fixed 6-lane roster (visuals/names are constant). Win weight is randomized fresh for
// each game so the odds genuinely belong to *this* match — not a fixed global table.
// Players can pay to see this game's actual win history instead of the hidden weights,
// which only approximates them since the sample size (a handful of races) is small.
const HORSE_ROSTER = [
  { id: 1, image: '/assets/horses/1_pony.png', name: '포니', style: 'normal' },
  { id: 2, image: '/assets/horses/2_mallangi.png', name: '말랑이', style: 'normal' },
  { id: 3, image: '/assets/horses/3_terius.png', name: '테리우스', style: 'backward' }, // runs backward
  { id: 4, image: '/assets/horses/4_golden.png', name: '골든', style: 'tripod' }, // wobbles on three legs
  { id: 5, image: '/assets/horses/5_huimangi.png', name: '희망이', style: 'flying' }, // flies
  { id: 6, image: '/assets/horses/6_thunder.png', name: '썬더', style: 'normal' },
];

const MIN_WEIGHT = 8;
const MAX_WEIGHT = 30;

// Generates a fresh random weight distribution for one game (id -> weight).
function rollHorseWeights() {
  const weights = {};
  HORSE_ROSTER.forEach(h => {
    weights[h.id] = MIN_WEIGHT + Math.floor(Math.random() * (MAX_WEIGHT - MIN_WEIGHT + 1));
  });
  return weights;
}

function pickWeightedWinner(weights) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const h of HORSE_ROSTER) {
    roll -= weights[h.id] || 0;
    if (roll <= 0) return h.id;
  }
  return HORSE_ROSTER[HORSE_ROSTER.length - 1].id;
}

module.exports = { HORSE_ROSTER, rollHorseWeights, pickWeightedWinner };
