import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast } from './game.js';

const $ = id => document.getElementById(id);

export function initStreak() {
  if ($('streakBtn')) $('streakBtn').onclick = () => { renderStreak(); $('streakModal').classList.add('active'); };
  if ($('closeStreak')) $('closeStreak').onclick = () => $('streakModal').classList.remove('active');
  if ($('claimStreakBtn')) $('claimStreakBtn').onclick = claimReward;
}

function renderStreak() {
  const lastLogin = state.userData.lastLogin ? state.userData.lastLogin.toMillis() : 0;
  const streak = state.userData.streak || 0;
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  let currentStreak = streak;
  if (lastLogin !== 0 && now - lastLogin > 2 * oneDay) currentStreak = 0;

  const nextDay = currentStreak + 1;
  const rewards = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const reward = rewards[Math.min(nextDay - 1, rewards.length - 1)];

  $('streakIcon').textContent = nextDay > 7 ? '🏆' : '🎁';
  $('streakTitle').textContent = `День ${nextDay}`;
  $('streakReward').textContent = reward.toLocaleString('ru-RU') + ' ₽';

  const btn = $('claimStreakBtn');
  if (now - lastLogin < oneDay && lastLogin !== 0) {
    btn.disabled = true;
    btn.textContent = 'Уже получено сегодня';
  } else {
    btn.disabled = false;
    btn.textContent = 'Забрать';
  }
}

async function claimReward() {
  const now = Date.now();
  const lastLogin = state.userData.lastLogin ? state.userData.lastLogin.toMillis() : 0;
  const oneDay = 24 * 60 * 60 * 1000;

  if (now - lastLogin < oneDay && lastLogin !== 0) return toast('Приходи завтра!');

  let streak = state.userData.streak || 0;
  if (lastLogin !== 0 && now - lastLogin > 2 * oneDay) streak = 0;
  
  streak++;
  const rewards = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const reward = rewards[Math.min(streak - 1, rewards.length - 1)];

  await updateDoc(doc(db, 'users', currentUser.uid), {
    balance: increment(reward),
    streak: streak,
    lastLogin: serverTimestamp()
  });

  toast(`🔥 Стрик: День ${streak}! +${reward.toLocaleString('ru-RU')} ₽`);
  $('streakModal').classList.remove('active');
}