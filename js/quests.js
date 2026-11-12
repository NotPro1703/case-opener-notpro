import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { currentUser, state, toast } from './game.js';

export const DAILY_QUESTS = [
  { id: 'open_10', title: 'Открой 10 кейсов', target: 10, type: 'opened', rewardXp: 100, rewardMoney: 5000 },
  { id: 'win_10k', title: 'Выиграй 10 000 ₽', target: 10000, type: 'earned', rewardXp: 200, rewardMoney: 10000 },
  { id: 'gift_1000', title: 'Переведи другу 1 000 ₽', target: 1000, type: 'gifted', rewardXp: 150, rewardMoney: 2000 }
];

export const ACHIEVEMENTS = [
  { id: 'first_case', title: 'Первый шаг', desc: 'Открой первый кейс', icon: '🎁', check: (d) => (d.totalOpened || 0) >= 1 },
  { id: 'rich_1m', title: 'Миллионер', desc: 'Накопи 1 000 000 ₽', icon: '💰', check: (d) => (d.balance || 0) >= 1000000 },
  { id: 'jackpot', title: 'Джекпот!', desc: 'Сорви куш', icon: '👑', check: (d) => (d.bestDrop || 0) >= 100000 },
  { id: 'level_10', title: 'Опытный', desc: 'Достигни 10 уровня', icon: '⭐', check: (d) => (d.level || 1) >= 10 }
];

export function checkLevelUp(newXp) {
  let level = 1;
  let xpNeeded = 10;
  let totalXpForLevel = 0;

  // Максимальный уровень 500, рост XP в 2.5 раза
  while (newXp >= totalXpForLevel + xpNeeded && level < 500) {
    totalXpForLevel += xpNeeded;
    level++;
    xpNeeded = Math.floor(10 * Math.pow(level, 1.5)); 
  }

  if (level > state.level) {
    updateDoc(doc(db, 'users', currentUser.uid), { level: level });
    toast(`🎉 Новый уровень: ${level}!`);
  }
}

export async function checkQuests() {
  if (!currentUser) return;
  const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
  const uData = uDoc.data();
  if (!uData.quests) return;

  let updated = false;
  const q = uData.quests;

  DAILY_QUESTS.forEach(quest => {
    const qData = q[quest.id];
    if (qData && qData.progress >= quest.target && !qData.claimed) {
      qData.claimed = true;
      uData.xp += quest.rewardXp;
      uData.balance += quest.rewardMoney;
      updated = true;
      toast(`Квест выполнен: ${quest.title}! +${quest.rewardMoney}₽`);
    }
  });

  if (updated) {
    await updateDoc(doc(db, 'users', currentUser.uid), { balance: uData.balance, xp: uData.xp, quests: q });
    checkLevelUp(uData.xp);
  }
}

export async function usePromo(code) {
  if (!currentUser || !code) return;
  code = code.toLowerCase().trim();
  if (!code) return;

  try {
    const promoSnap = await getDoc(doc(db, 'promocodes', code));
    if (!promoSnap.exists()) return toast('Промокод не найден');
    
    const pData = promoSnap.data();
    const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const uData = uDoc.data();
    const used = uData.usedPromos || [];

    if (used.includes(code)) return toast('Вы уже использовали этот промокод');

    const money = Number(pData.money) || 0;
    const xp = Number(pData.xp) || 0;

    await updateDoc(doc(db, 'users', currentUser.uid), {
      balance: increment(money),
      xp: increment(xp),
      usedPromos: [...used, code]
    });

    toast(`Промокод активирован! +${money}₽, +${xp}XP`);
    checkLevelUp((uData.xp || 0) + xp);
  } catch (e) { 
    console.error(e);
    toast('Ошибка активации'); 
  }
}

export function checkAchievements() {
  const el = document.getElementById('achievementsList');
  if (!el || !state.userData) return;
  
  el.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = a.check(state.userData);
    return `
      <div style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.05); margin-bottom:5px; opacity:${unlocked ? '1' : '0.4'};">
        <div style="font-size:1.5rem; filter:${unlocked ? 'none' : 'grayscale(1)'}">${a.icon}</div>
        <div>
          <div style="font-weight:bold; color:${unlocked ? '#ffd700' : '#fff'}">${a.title}</div>
          <div style="font-size:0.8rem; color:#8ba3c7;">${a.desc}</div>
        </div>
      </div>
    `;
  }).join('');
}