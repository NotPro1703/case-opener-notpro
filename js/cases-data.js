export const CASES = {
  /* ==================== СТАРТОВЫЕ ==================== */
  wood: { id: 'wood', name: 'Деревянный', icon: '🪵', price: 25, drops: [{ amount: 10, chance: 45 }, { amount: 25, chance: 28 }, { amount: 50, chance: 17 }, { amount: 100, chance: 8 }, { amount: 250, chance: 1.8 }, { amount: 500, chance: 0.2 }] },
  stone: { id: 'stone', name: 'Каменный', icon: '🪨', price: 60, drops: [{ amount: 15, chance: 42 }, { amount: 50, chance: 28 }, { amount: 120, chance: 18 }, { amount: 300, chance: 9 }, { amount: 700, chance: 2.7 }, { amount: 1500, chance: 0.3 }] },
  iron: { id: 'iron', name: 'Железный', icon: '⚙️', price: 120, drops: [{ amount: 20, chance: 40 }, { amount: 80, chance: 30 }, { amount: 200, chance: 18 }, { amount: 500, chance: 9 }, { amount: 1200, chance: 2.7 }, { amount: 3000, chance: 0.3 }] },
  gold: { id: 'gold', name: 'Золотой', icon: '🥇', price: 250, drops: [{ amount: 30, chance: 38 }, { amount: 150, chance: 30 }, { amount: 400, chance: 20 }, { amount: 1000, chance: 9 }, { amount: 2500, chance: 2.7 }, { amount: 7000, chance: 0.3 }] },
  diamond: { id: 'diamond', name: 'Алмазный', icon: '💎', price: 500, drops: [{ amount: 50, chance: 36 }, { amount: 250, chance: 30 }, { amount: 700, chance: 20 }, { amount: 1800, chance: 10 }, { amount: 5000, chance: 3.5 }, { amount: 15000, chance: 0.5 }] },

  /* ==================== ОСОБЫЕ ==================== */
  bee: { id: 'bee', name: 'Пчелиный', icon: '🐝', price: 20, drops: [{ amount: 5, chance: 40 }, { amount: 15, chance: 30 }, { amount: 50, chance: 20 }, { amount: 150, chance: 9.9 }, { amount: 1000, chance: 0.1, big: true }] },
  big_reward: { id: 'big_reward', name: 'Большая награда', icon: '💸', price: 10, drops: [{ amount: 10, chance: 99 }, { amount: 1000, chance: 1, big: true }] },
  jackpot: { id: 'jackpot', name: 'Джекпот', icon: '🎰', price: 100, drops: [{ amount: 100, chance: 99 }, { amount: 100000, chance: 1, jackpot: true }] },

  /* ==================== СРЕДНИЕ ==================== */
  daily: { id: 'daily', name: 'Ежедневный', icon: '🎁', price: 0, cooldown: 86400000, drops: [{ amount: 100, chance: 55 }, { amount: 300, chance: 30 }, { amount: 1000, chance: 10 }, { amount: 2500, chance: 4.5, big: true }, { amount: 10000, chance: 0.5, jackpot: true }] },
  hourly: { id: 'hourly', name: 'Каждый час', icon: '⏰', price: 0, cooldown: 3600000, drops: [{ amount: 25, chance: 50 }, { amount: 75, chance: 28 }, { amount: 200, chance: 14 }, { amount: 500, chance: 6 }, { amount: 1500, chance: 1.8, big: true }, { amount: 5000, chance: 0.2, jackpot: true }] },
  starter: { id: 'starter', name: 'Стартовый', icon: '📦', price: 50, drops: [{ amount: 25, chance: 45 }, { amount: 67, chance: 28 }, { amount: 111, chance: 18 }, { amount: 400, chance: 7 }, { amount: 999, chance: 1.8 }, { amount: 1488, chance: 0.2 }] },
  common: { id: 'common', name: 'Обыкновенный', icon: '💼', price: 125, drops: [{ amount: 50, chance: 48 }, { amount: 200, chance: 28 }, { amount: 500, chance: 16 }, { amount: 1000, chance: 6 }, { amount: 2000, chance: 1.8 }, { amount: 5000, chance: 0.2 }] },
  mishko: { id: 'mishko', name: 'Мишко', icon: '🐻', price: 75, drops: [{ amount: 20, chance: 42 }, { amount: 60, chance: 28 }, { amount: 150, chance: 18 }, { amount: 400, chance: 9 }, { amount: 900, chance: 2.7 }, { amount: 2000, chance: 0.3 }] },
  barni: { id: 'barni', name: 'Барни', icon: '🍫', price: 150, drops: [{ amount: 40, chance: 40 }, { amount: 120, chance: 28 }, { amount: 300, chance: 18 }, { amount: 750, chance: 9.5 }, { amount: 1800, chance: 3.5 }, { amount: 4500, chance: 1 }] },
  mimishka: { id: 'mimishka', name: 'Мимишка', icon: '🧸', price: 300, drops: [{ amount: 60, chance: 38 }, { amount: 200, chance: 30 }, { amount: 550, chance: 18 }, { amount: 1400, chance: 9 }, { amount: 3500, chance: 3.7 }, { amount: 9000, chance: 1.3 }] },
  hamster: { id: 'hamster', name: 'Хомяк', icon: '🐹', price: 200, drops: [{ amount: 50, chance: 41 }, { amount: 160, chance: 28 }, { amount: 420, chance: 18 }, { amount: 1000, chance: 8.5 }, { amount: 2600, chance: 3.5 }, { amount: 6500, chance: 1 }] },
  homa: { id: 'homa', name: 'Хома', icon: '🐿️', price: 450, drops: [{ amount: 100, chance: 37 }, { amount: 350, chance: 30 }, { amount: 900, chance: 18 }, { amount: 2200, chance: 9.5 }, { amount: 5500, chance: 4 }, { amount: 14000, chance: 1.5 }] },
  chernobyl: { id: 'chernobyl', name: 'Чернобыль', icon: '☢️', price: 1500, drops: [{ amount: 0, chance: 25 }, { amount: 800, chance: 30 }, { amount: 2500, chance: 22 }, { amount: 7000, chance: 13 }, { amount: 20000, chance: 7, big: true }, { amount: 80000, chance: 2.5, big: true }, { amount: 300000, chance: 0.5, jackpot: true }] },

  /* ==================== GPT (ДОРОГИЕ) ==================== */
  neural: { id: 'neural', name: 'Нейро-кейс', icon: '🧠', price: 2000, drops: [{ amount: 500, chance: 40 }, { amount: 1500, chance: 28 }, { amount: 5000, chance: 18 }, { amount: 12000, chance: 9 }, { amount: 30000, chance: 4.5, big: true }, { amount: 120000, chance: 0.5, jackpot: true }] },
  quantum: { id: 'quantum', name: 'Квантовый', icon: '⚛️', price: 4000, drops: [{ amount: 0, chance: 35 }, { amount: 2000, chance: 28 }, { amount: 8000, chance: 20 }, { amount: 20000, chance: 10 }, { amount: 60000, chance: 6, big: true }, { amount: 250000, chance: 1, jackpot: true }] },
  cosmic: { id: 'cosmic', name: 'Космический', icon: '🌌', price: 10000, drops: [{ amount: 0, chance: 30 }, { amount: 5000, chance: 28 }, { amount: 15000, chance: 20 }, { amount: 40000, chance: 12 }, { amount: 100000, chance: 8, big: true }, { amount: 500000, chance: 2, jackpot: true }] },

  /* ==================== УРОВНЕВЫЕ ==================== */
  royal_bee: { id: 'royal_bee', name: 'Королевский пчелиный', icon: '👑', price: 10000, reqLevel: 10, drops: [{ amount: 1000, chance: 40 }, { amount: 5000, chance: 30 }, { amount: 15000, chance: 18 }, { amount: 40000, chance: 8.9 }, { amount: 150000, chance: 1, big: true }] },
  tiktok: { id: 'tiktok', name: 'TikTok', icon: '🎵', price: 25000, reqLevel: 15, drops: [{ amount: 2500, chance: 38 }, { amount: 10000, chance: 28 }, { amount: 35000, chance: 20 }, { amount: 100000, chance: 10 }, { amount: 300000, chance: 3.5 }, { amount: 1000000, chance: 0.5, jackpot: true }] },
  vydra: { id: 'vydra', name: 'Выдра', icon: '🦦', price: 100000, reqLevel: 30, drops: [{ amount: 10000, chance: 40 }, { amount: 40000, chance: 28 }, { amount: 120000, chance: 18 }, { amount: 350000, chance: 9.5 }, { amount: 1000000, chance: 3.5 }, { amount: 5000000, chance: 1, jackpot: true }] },
  millionaire: { id: 'millionaire', name: 'Миллионер', icon: '💰', price: 1000000, reqLevel: 100, drops: [{ amount: 100000, chance: 42 }, { amount: 500000, chance: 28 }, { amount: 1500000, chance: 18 }, { amount: 5000000, chance: 8.9 }, { amount: 20000000, chance: 1, jackpot: true }] },
  mellstroy: { id: 'mellstroy', name: 'Меллстрой', icon: '💸', price: 10000000, reqLevel: 250, drops: [{ amount: 1000000, chance: 40 }, { amount: 5000000, chance: 30 }, { amount: 20000000, chance: 18 }, { amount: 75000000, chance: 9.5 }, { amount: 500000000, chance: 2.5, jackpot: true }] },

  /* ==================== 10 КЕЙСОВ (3.1) ==================== */
  cyber: { id: 'cyber', name: 'Киберпанк', icon: '🤖', price: 150000, reqLevel: 40, drops: [{ amount: 20000, chance: 40 }, { amount: 60000, chance: 30 }, { amount: 150000, chance: 18 }, { amount: 400000, chance: 9 }, { amount: 1000000, chance: 2.5 }, { amount: 5000000, chance: 0.5, jackpot: true }] },
  dragon: { id: 'dragon', name: 'Драконий', icon: '🐉', price: 300000, reqLevel: 50, drops: [{ amount: 50000, chance: 42 }, { amount: 150000, chance: 28 }, { amount: 400000, chance: 18 }, { amount: 1200000, chance: 9 }, { amount: 4000000, chance: 2.5 }, { amount: 15000000, chance: 0.5, jackpot: true }] },
  space: { id: 'space', name: 'Орбитальный', icon: '🚀', price: 500000, reqLevel: 60, drops: [{ amount: 100000, chance: 40 }, { amount: 300000, chance: 30 }, { amount: 800000, chance: 18 }, { amount: 2500000, chance: 9 }, { amount: 8000000, chance: 2.5 }, { amount: 30000000, chance: 0.5, jackpot: true }] },
  pharaoh: { id: 'pharaoh', name: 'Фараон', icon: '🏺', price: 1000000, reqLevel: 80, drops: [{ amount: 200000, chance: 40 }, { amount: 600000, chance: 30 }, { amount: 1500000, chance: 18 }, { amount: 5000000, chance: 9 }, { amount: 15000000, chance: 2.5 }, { amount: 50000000, chance: 0.5, jackpot: true }] },
  titan: { id: 'titan', name: 'Титан', icon: '🏛️', price: 2500000, reqLevel: 100, drops: [{ amount: 500000, chance: 41 }, { amount: 1500000, chance: 29 }, { amount: 4000000, chance: 18 }, { amount: 12000000, chance: 9 }, { amount: 40000000, chance: 2.5 }, { amount: 150000000, chance: 0.5, jackpot: true }] },
  galaxy: { id: 'galaxy', name: 'Галактика', icon: '🌌', price: 5000000, reqLevel: 130, drops: [{ amount: 1000000, chance: 40 }, { amount: 3000000, chance: 30 }, { amount: 8000000, chance: 18 }, { amount: 25000000, chance: 9 }, { amount: 80000000, chance: 2.5 }, { amount: 300000000, chance: 0.5, jackpot: true }] },
  god: { id: 'god', name: 'Божественный', icon: '👼', price: 10000000, reqLevel: 170, drops: [{ amount: 2000000, chance: 40 }, { amount: 6000000, chance: 30 }, { amount: 15000000, chance: 18 }, { amount: 50000000, chance: 9 }, { amount: 150000000, chance: 2.5 }, { amount: 600000000, chance: 0.5, jackpot: true }] },
  infinity: { id: 'infinity', name: 'Бесконечность', icon: '♾️', price: 25000000, reqLevel: 200, drops: [{ amount: 5000000, chance: 40 }, { amount: 15000000, chance: 30 }, { amount: 40000000, chance: 18 }, { amount: 120000000, chance: 9 }, { amount: 400000000, chance: 2.5 }, { amount: 1500000000, chance: 0.5, jackpot: true }] },
  multiverse: { id: 'multiverse', name: 'Мультивселенная', icon: '🌍', price: 50000000, reqLevel: 250, drops: [{ amount: 10000000, chance: 40 }, { amount: 30000000, chance: 30 }, { amount: 80000000, chance: 18 }, { amount: 250000000, chance: 9 }, { amount: 800000000, chance: 2.5 }, { amount: 3000000000, chance: 0.5, jackpot: true }] },
  absolute: { id: 'absolute', name: 'Абсолют', icon: '💠', price: 100000000, reqLevel: 300, drops: [{ amount: 20000000, chance: 40 }, { amount: 60000000, chance: 30 }, { amount: 150000000, chance: 18 }, { amount: 500000000, chance: 9 }, { amount: 1500000000, chance: 2.5 }, { amount: 10000000000, chance: 0.5, jackpot: true }] },

  /* ==================== 5 НОВЫХ КЕЙСОВ (3.2) ==================== */
  singularity: { id: 'singularity', name: 'Сингулярность', icon: '🌑', price: 100000000, reqLevel: 250, drops: [{ amount: 15000000, chance: 40 }, { amount: 45000000, chance: 30 }, { amount: 120000000, chance: 18 }, { amount: 400000000, chance: 9 }, { amount: 1200000000, chance: 2.5 }, { amount: 5000000000, chance: 0.5, jackpot: true }] },
  quantum_realm: { id: 'quantum_realm', name: 'Квантовый разлом', icon: '🌀', price: 250000000, reqLevel: 300, drops: [{ amount: 40000000, chance: 41 }, { amount: 120000000, chance: 29 }, { amount: 300000000, chance: 18 }, { amount: 1000000000, chance: 9 }, { amount: 3000000000, chance: 2.5 }, { amount: 12000000000, chance: 0.5, jackpot: true }] },
  celestial: { id: 'celestial', name: 'Небесный трон', icon: '✨', price: 500000000, reqLevel: 350, drops: [{ amount: 100000000, chance: 40 }, { amount: 300000000, chance: 30 }, { amount: 800000000, chance: 18 }, { amount: 2500000000, chance: 9 }, { amount: 8000000000, chance: 2.5 }, { amount: 30000000000, chance: 0.5, jackpot: true }] },
  abyss: { id: 'abyss', name: 'Бездна', icon: '👁️', price: 1000000000, reqLevel: 400, drops: [{ amount: 200000000, chance: 40 }, { amount: 600000000, chance: 30 }, { amount: 1500000000, chance: 18 }, { amount: 5000000000, chance: 9 }, { amount: 15000000000, chance: 2.5 }, { amount: 60000000000, chance: 0.5, jackpot: true }] },
  omniverse: { id: 'omniverse', name: 'Омнивселенная', icon: '♾️', price: 5000000000, reqLevel: 450, drops: [{ amount: 1000000000, chance: 42 }, { amount: 3000000000, chance: 28 }, { amount: 8000000000, chance: 18 }, { amount: 25000000000, chance: 9 }, { amount: 80000000000, chance: 2.5 }, { amount: 300000000000, chance: 0.5, jackpot: true }] }
};

/* ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================== */

export function rollDrop(drops, luck = 1) {
  let adjustedDrops = drops.map(d => {
    let c = d.chance;
    if (d.big || d.jackpot || d.amount >= 1000) c = c / 1.2;
    else c = c * 1.2;
    
    if (luck > 1) {
      if (d.big || d.jackpot || d.amount >= 1000) c *= luck;
      else c /= luck;
    }
    return { ...d, chance: c };
  });

  const total = adjustedDrops.reduce((s, d) => s + d.chance, 0);
  let r = Math.random() * total;
  for (const d of adjustedDrops) {
    if (r < d.chance) {
      // 3.2: Уменьшаем выигрыш в 1.5 раза
      return { ...d, amount: Math.floor(d.amount / 1.5) };
    }
    r -= d.chance;
  }
  const last = adjustedDrops[adjustedDrops.length - 1];
  return { ...last, amount: Math.floor(last.amount / 1.5) };
}

export function rarityClass(d) {
  if (d.jackpot) return 'rarity-jackpot';
  if (d.big) return 'rarity-legendary';
  if (d.amount >= 100000) return 'rarity-epic';
  if (d.amount >= 5000) return 'rarity-rare';
  return 'rarity-common';
}

export function dropEmoji(d) {
  if (d.jackpot) return '👑';
  if (d.big) return '💎';
  if (d.amount === 0) return '💨';
  if (d.amount >= 100000) return '🟣';
  if (d.amount >= 5000) return '🔵';
  return '💰';
}