import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, increment 
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { CASES, rollDrop, rarityClass, dropEmoji } from './cases-data.js';
import { initFriends } from './friends.js';
import { initChat } from './chat.js';
import { initLeaderboard, openLeaderboard } from './leaderboard.js';
import { checkQuests, checkLevelUp, usePromo, checkAchievements, DAILY_QUESTS } from './quests.js';

const $ = id => document.getElementById(id);

export let currentUser = null;
export let state = { balance: 0, level: 1, xp: 0, friends: [], requests: [], userData: {} };
export let activeEvent = { multiplier: 1, luck: 1, endTime: null };

let toastTimer;
export function toast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function updateBalanceUI() {
  if ($('balance')) $('balance').textContent = state.balance.toLocaleString('ru-RU');
  if ($('playerLevel')) $('playerLevel').textContent = state.level;
  if ($('playerXp')) $('playerXp').textContent = `${state.xp % 1000} / 1000 XP`;
}

/* ==================== АВТОРИЗАЦИЯ ==================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = 'index.html'; return; }

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) { 
    console.warn("Профиль не найден.");
    location.href = 'index.html';
    return; 
  }

  const data = userDoc.data();
  currentUser = { uid: user.uid, username: data.username };
  state.balance = data.balance || 0;
  state.level = data.level || 1;
  state.xp = data.xp || 0;
  state.userData = data;

  if (data.isAdmin === true) {
    const adminBtn = $('adminBtn');
    if (adminBtn) adminBtn.style.display = 'flex';
  }
  
  updateBalanceUI();
  renderCases();
  renderStats();

  onSnapshot(doc(db, 'users', user.uid), (snap) => {
    if (snap.exists()) {
      state.userData = snap.data();
      state.balance = state.userData.balance || 0;
      state.level = state.userData.level || 1;
      state.xp = state.userData.xp || 0;
      updateBalanceUI();
      renderCases();
    }
  });

  // Слушаем глобальный джекпот
  onSnapshot(doc(db, 'settings', 'globalJackpot'), (snap) => {
    if (snap.exists() && $('globalJackpot')) {
      $('globalJackpot').textContent = (snap.data().amount || 0).toLocaleString('ru-RU') + ' ₽';
    }
  });

  // Слушаем ивенты
  onSnapshot(doc(db, 'settings', 'events'), (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      activeEvent = {
        multiplier: Number(d.multiplier) || 1,
        luck: Number(d.luck) || 1,
        endTime: d.endTime ? (d.endTime.toMillis ? d.endTime.toMillis() : Number(d.endTime)) : null
      };
      updateEventBanner();
    }
  });

  initFriends(currentUser, state, db);
  initChat(currentUser, state, db);
  initLeaderboard();
});

/* ==================== ИВЕНТЫ ==================== */
function updateEventBanner() {
  const banner = $('eventBanner');
  if (!banner) return;

  const now = Date.now();
  if (!activeEvent.endTime || activeEvent.endTime < now || (activeEvent.multiplier === 1 && activeEvent.luck === 1)) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'block';
  
  let desc = [];
  if (activeEvent.multiplier > 1) desc.push(`x${activeEvent.multiplier} к деньгам`);
  if (activeEvent.luck > 1) desc.push(`x${activeEvent.luck} удача`);
  
  $('eventTitle').textContent = "🔥 ГЛОБАЛЬНЫЙ ИВЕНТ!";
  $('eventDesc').textContent = desc.join(' | ');

  const left = activeEvent.endTime - now;
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  $('eventTimer').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
setInterval(updateEventBanner, 1000);

/* ==================== КЕЙСЫ ==================== */
function renderCases() {
  const grid = $('cases');
  if (!grid) return;
  grid.innerHTML = '';
  
  Object.values(CASES).forEach(c => {
    const card = document.createElement('div');
    card.className = 'case-card';
    const isFree = c.price === 0;
    const isLocked = c.reqLevel && state.level < c.reqLevel;

    let onCooldown = false;
    if (isFree) {
      const lastOpen = c.id === 'daily' ? state.userData.lastDaily : state.userData.lastHourly;
      if (lastOpen) {
        const elapsed = Date.now() - (lastOpen.toMillis ? lastOpen.toMillis() : lastOpen);
        if (elapsed < c.cooldown) onCooldown = true;
      }
    }

    card.innerHTML = `
      <div class="case-icon">${c.icon}</div>
      <div class="case-name">${c.name}</div>
      ${c.reqLevel ? `<div style="font-size:0.75rem;color:${isLocked?'#ff6b6b':'#22c55e'}">${isLocked ? '🔒 ' : '✅ '} ${c.reqLevel} ур.</div>` : ''}
      <div class="case-price ${isFree ? 'free' : ''}">${isFree ? 'Бесплатно' : c.price.toLocaleString('ru-RU') + ' ₽'}</div>
      <div class="case-buy">
        ${isFree ? '' : `<select class="qty-select" ${isLocked?'disabled':''}>${Array.from({length:10},(_,i)=>`<option>${i+1}</option>`).join('')}</select>`}
        <button class="btn" ${onCooldown || isLocked ? 'disabled' : ''}>
          ${isLocked ? 'Заблокировано' : (onCooldown ? 'Ждите' : (isFree ? 'Получить' : 'Купить'))}
        </button>
      </div>
    `;
    grid.appendChild(card);

    const btn = card.querySelector('.btn');
    const sel = card.querySelector('.qty-select');

    btn.onclick = () => {
      if (onCooldown || isLocked) return;
      if (isFree) buyCase(c, 1);
      else {
        const qty = parseInt(sel.value);
        const total = c.price * qty;
        if (state.balance < total) return toast('Недостаточно средств');
        buyCase(c, qty);
      }
    };
    if (!isFree && !onCooldown && !isLocked && state.balance < c.price) btn.disabled = true;
  });
}

async function buyCase(caseObj, qty) {
  try {
    const totalCost = caseObj.price * qty;
    
    if (caseObj.price > 0) {
      await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-totalCost) });
      
      const jpRef = doc(db, 'settings', 'globalJackpot');
      const jpDoc = await getDoc(jpRef);
      const jpAmount = Math.floor(totalCost * 0.01);
      
      if (jpDoc.exists()) {
        await updateDoc(jpRef, { amount: increment(jpAmount) });
      } else {
        await setDoc(jpRef, { amount: jpAmount });
      }
    } else {
      const updateData = {};
      if (caseObj.id === 'daily') updateData.lastDaily = serverTimestamp();
      if (caseObj.id === 'hourly') updateData.lastHourly = serverTimestamp();
      await updateDoc(doc(db, 'users', currentUser.uid), updateData);
    }

    for (let i = 0; i < qty; i++) {
      const isGlobalJackpot = Math.random() * 100 < 0.01;
      let jpWinAmount = 0;

      if (isGlobalJackpot) {
        const jpDoc = await getDoc(doc(db, 'settings', 'globalJackpot'));
        if (jpDoc.exists()) {
          jpWinAmount = jpDoc.data().amount || 0;
          if (jpWinAmount > 0) await updateDoc(doc(db, 'settings', 'globalJackpot'), { amount: 0 });
        }
      }

      // ПРИМЕНЯЕМ ИВЕНТ НА УДАЧУ
      const prize = rollDrop(caseObj.drops, activeEvent.luck);
      
      // ПРИМЕНЯЕМ ИВЕНТ НА МНОЖИТЕЛЬ
      let finalAmount = isGlobalJackpot && jpWinAmount > 0 ? jpWinAmount : prize.amount;
      if (!isGlobalJackpot) {
         finalAmount = Math.floor(finalAmount * activeEvent.multiplier);
      }

      await updateDoc(doc(db, 'users', currentUser.uid), { 
        balance: increment(finalAmount),
        xp: increment(50),
        totalOpened: increment(1)
      });
      
      recordOpenStat(finalAmount);
      checkLevelUp(state.xp + 50);

      const displayPrize = { ...prize, amount: finalAmount, globalJackpot: isGlobalJackpot };
      await new Promise(resolve => {
        runRoulette(caseObj, displayPrize, resolve);
      });
    }
    
    checkQuests();
    checkAchievements();
  } catch (e) {
    console.error("Ошибка покупки:", e);
    toast('Ошибка: ' + e.message);
  }
}

/* ==================== РУЛЕТКА ==================== */
function runRoulette(caseObj, prize, onComplete = null) {
  const overlay = $('overlay');
  const strip = $('strip');
  const roulette = $('roulette');
  const resultBig = $('resultBig');
  const sellBtn = $('sellBtn');

  if (!overlay) { if (onComplete) onComplete(); return; }

  overlay.classList.add('active');
  resultBig.textContent = '';
  resultBig.className = 'result-big';
  sellBtn.style.display = 'none';

  const SLOT_W = 112, SLOT_COUNT = 80, WIN_INDEX = 70;
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    slots.push(i === WIN_INDEX ? prize : caseObj.drops[Math.floor(Math.random()*caseObj.drops.length)]);
  }
  
  strip.innerHTML = slots.map(d => `
    <div class="slot ${rarityClass(d)}">
      <div class="em">${dropEmoji(d)}</div>
      <div>${d.amount.toLocaleString('ru-RU')} ₽</div>
    </div>`).join('');

  const viewW = roulette.clientWidth;
  const targetX = -(WIN_INDEX * SLOT_W + SLOT_W/2 - viewW/2);
  const startX = -(2 * SLOT_W);
  strip.style.transform = `translateX(${startX}px)`;

  const DURATION = 5000;
  const startTime = performance.now();
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

  function frame(now) {
    const t = Math.min(1, (now - startTime) / DURATION);
    const x = startX + (targetX - startX) * easeOutQuint(t);
    strip.style.transform = `translateX(${x}px)`;
    if (t < 1) requestAnimationFrame(frame);
    else finish();
  }
  requestAnimationFrame(frame);

  function finish() {
    resultBig.className = 'result-big pop ' + (prize.globalJackpot ? 'rarity-jackpot' : rarityClass(prize));
    let suffix = prize.globalJackpot ? ' 👑 ГЛОБАЛЬНЫЙ ДЖЕКПОТ!' : prize.jackpot ? ' 🎉 ДЖЕКПОТ!' : prize.big ? ' 🔥 Крупный!' : prize.amount === 0 ? ' 💨 Пусто...' : '';
    resultBig.textContent = `+${prize.amount.toLocaleString('ru-RU')} ₽${suffix}`;

    sellBtn.style.display = '';
    sellBtn.textContent = 'Забрать';
    sellBtn.onclick = () => {
      overlay.classList.remove('active');
      if (onComplete) onComplete();
    };
  }
}

/* ==================== СТАТИСТИКА ==================== */
function renderStats() {
  const s = JSON.parse(localStorage.getItem('co3_stats') || 'null') || { opened: 0, earned: 0, best: 0 };
  const el = $('stats');
  if (el) el.innerHTML = `
    <div class="stat-card"><div class="s-label">Открыто</div><div class="s-value">${s.opened}</div></div>
    <div class="stat-card"><div class="s-label">Выиграно</div><div class="s-value plus">${s.earned.toLocaleString('ru-RU')} ₽</div></div>
    <div class="stat-card"><div class="s-label">Лучший дроп</div><div class="s-value gold">${s.best.toLocaleString('ru-RU')} ₽</div></div>
  `;
}
function recordOpenStat(amount) {
  const s = JSON.parse(localStorage.getItem('co3_stats') || 'null') || { opened: 0, earned: 0, best: 0 };
  s.opened++; s.earned += amount; if (amount > s.best) s.best = amount;
  localStorage.setItem('co3_stats', JSON.stringify(s)); renderStats();
}

/* ==================== UI ==================== */
const logoutBtn = $('logoutBtn'); 
if (logoutBtn) logoutBtn.onclick = () => signOut(auth).then(() => location.href = 'index.html');

const lbBtn = $('lbBtn'); 
if (lbBtn) lbBtn.onclick = () => openLeaderboard();
const closeLb = $('closeLb'); 
if (closeLb) closeLb.onclick = () => $('lbModal').classList.remove('active');

const friendsBtn = $('friendsBtn'); 
if (friendsBtn) friendsBtn.onclick = () => $('friendsModal').classList.add('active');
const closeFriends = $('closeFriends'); 
if (closeFriends) closeFriends.onclick = () => $('friendsModal').classList.remove('active');

const closeChat = $('closeChat'); 
if (closeChat) closeChat.onclick = () => $('chatModal').classList.remove('active');

const closeGift = $('closeGift'); 
if (closeGift) closeGift.onclick = () => $('giftModal').classList.remove('active');

const promoBtn = $('promoBtn');
if (promoBtn) {
  promoBtn.onclick = () => { 
    const code = $('promoInput').value; 
    usePromo(code); 
    $('promoInput').value = ''; 
  };
}

const profileBtn = $('profileBtn');
if (profileBtn) {
  profileBtn.onclick = () => {
    $('profName').textContent = currentUser.username;
    $('profLevel').textContent = `Уровень ${state.level} (${state.xp % 1000} / 1000 XP)`;
    checkAchievements();
    
    const ql = $('questsList');
    if (ql && state.userData.quests) {
      ql.innerHTML = DAILY_QUESTS.map(q => {
        const prog = state.userData.quests[q.id]?.progress || 0;
        return `<div style="margin-bottom:8px; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px;">
          <div>${q.title} (${prog}/${q.target})</div>
          <div style="font-size:0.75rem; color:#8ba3c7;">Награда: ${q.rewardMoney}₽ + ${q.rewardXp}XP</div>
        </div>`;
      }).join('');
    } else if (ql) {
      ql.innerHTML = '<div style="color:#8ba3c7;">Квестов пока нет</div>';
    }
    $('profileModal').classList.add('active');
  };
}
const closeProfile = $('closeProfile'); 
if (closeProfile) closeProfile.onclick = () => $('profileModal').classList.remove('active');