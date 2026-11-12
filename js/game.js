import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, increment, arrayUnion, addDoc, collection 
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { CASES, rollDrop, rarityClass, dropEmoji } from './cases-data.js';
import { initFriends } from './friends.js';
import { initChat } from './chat.js';
import { initLeaderboard, openLeaderboard } from './leaderboard.js';
import { checkQuests, checkLevelUp, usePromo, checkAchievements, DAILY_QUESTS } from './quests.js';
import { initGlobalChat, sendGlobalMessage } from './global-chat.js';
import { initClans } from './clans.js';
import { initStreak } from './streak.js';
import { initSchool } from './school.js';
import { initFriday13 } from './friday13.js';
import { initInventory } from './inventory.js';

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
  
  if ($('playerXp')) {
    let xpNeededForCurrent = 50;
    let totalXpBefore = 0;
    for (let i = 1; i < state.level; i++) {
      totalXpBefore += xpNeededForCurrent;
      xpNeededForCurrent = Math.floor(50 * Math.pow(i + 1, 2.5));
    }
    
    let xpNeededForNext = Math.floor(50 * Math.pow(state.level, 2.5));
    const currentXpInLevel = Math.max(0, state.xp - totalXpBefore);
    $('playerXp').textContent = `${currentXpInLevel} / ${xpNeededForNext} XP`;
  }
}

/* ==================== ПОГОДА И ИВЕНТЫ ==================== */
function updateWeather() {
  const h = new Date().getHours();
  let weather = "Ясно", bg = "#070b14";
  if (h >= 0 && h < 6) { weather = "Ночь (x1.1 удача)"; bg = "#020308"; }
  else if (h >= 6 && h < 12) { weather = "Утро"; bg = "#111827"; }
  else if (h >= 12 && h < 18) { weather = "День"; bg = "#16203a"; }
  else { weather = "Вечер"; bg = "#0f172a"; }
  if ($('weatherStatus')) $('weatherStatus').textContent = weather;
  document.body.style.background = bg;
}
updateWeather(); setInterval(updateWeather, 60000);

function updateEventBanner() {
  const banner = $('eventBanner'); if (!banner) return;
  const now = Date.now();
  if (!activeEvent.endTime || activeEvent.endTime < now || (activeEvent.multiplier === 1 && activeEvent.luck === 1)) { banner.style.display = 'none'; return; }
  banner.style.display = 'block';
  let desc = [];
  if (activeEvent.multiplier > 1) desc.push(`x${activeEvent.multiplier} к деньгам`);
  if (activeEvent.luck > 1) desc.push(`x${activeEvent.luck} удача`);
  $('eventDesc').textContent = desc.join(' | ');
  const left = activeEvent.endTime - now;
  $('eventTimer').textContent = `${String(Math.floor(left / 3600000)).padStart(2,'0')}:${String(Math.floor((left % 3600000) / 60000)).padStart(2,'0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2,'0')}`;
}
setInterval(updateEventBanner, 1000);

/* ==================== АВТОРИЗАЦИЯ ==================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = 'index.html'; return; }
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) { location.href = 'index.html'; return; }
    const data = userDoc.data();
    currentUser = { uid: user.uid, username: data.username || 'Игрок' };
    state.balance = data.balance || 0; state.level = data.level || 1; state.xp = data.xp || 0; state.userData = data;
    if (data.isAdmin) { if ($('adminBtn')) $('adminBtn').style.display = 'flex'; }
    
    updateBalanceUI(); renderCases(); renderStats();

    onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        state.userData = snap.data(); state.balance = state.userData.balance || 0; state.level = state.userData.level || 1; state.xp = state.userData.xp || 0;
        updateBalanceUI(); renderCases();
      }
    });
    onSnapshot(doc(db, 'settings', 'globalJackpot'), (snap) => { if (snap.exists() && $('globalJackpot')) $('globalJackpot').textContent = (snap.data().amount || 0).toLocaleString('ru-RU') + ' ₽'; });
    onSnapshot(doc(db, 'settings', 'events'), (snap) => { if (snap.exists()) { const d = snap.data(); activeEvent = { multiplier: Number(d.multiplier) || 1, luck: Number(d.luck) || 1, endTime: d.endTime ? (d.endTime.toMillis ? d.endTime.toMillis() : Number(d.endTime)) : null }; updateEventBanner(); } });

    initFriends(currentUser, state, db);
    initChat(currentUser, state, db);
    initLeaderboard();
    initGlobalChat(currentUser);
    initClans(currentUser, state);
    initStreak();
    initSchool();
    initFriday13();
    initInventory();
  } catch (err) { console.error(err); toast("Ошибка загрузки"); }
});

/* ==================== МАГАЗИН И ПОКУПКА ==================== */
function renderCases() {
  const grid = $('cases'); if (!grid) return; grid.innerHTML = '';
  Object.values(CASES).forEach(c => {
    const card = document.createElement('div'); card.className = 'case-card';
    const isFree = c.price === 0;
    
    // Проверка уровня и престижа
    const isLockedByLevel = c.reqLevel && state.level < c.reqLevel;
    const isLockedByPrestige = c.reqPrestige && (state.userData.prestige || 0) < c.reqPrestige;
    const isLocked = isLockedByLevel || isLockedByPrestige;

    let onCooldown = false;
    if (isFree) {
      const lastOpen = c.id === 'daily' ? state.userData.lastDaily : state.userData.lastHourly;
      if (lastOpen) { const elapsed = Date.now() - (lastOpen.toMillis ? lastOpen.toMillis() : lastOpen); if (elapsed < c.cooldown) onCooldown = true; }
    }
    
    card.innerHTML = `
      <div class="case-icon">${c.icon}</div><div class="case-name">${c.name}</div>
      ${c.reqLevel || c.reqPrestige ? `<div style="font-size:0.75rem;color:${isLocked?'#ff6b6b':'#22c55e'}">
        ${isLocked ? '🔒 ' : '✅ '} 
        ${c.reqLevel ? c.reqLevel + ' ур. ' : ''} 
        ${c.reqPrestige ? '⭐' + c.reqPrestige + ' престиж' : ''}
      </div>` : ''}
      <div class="case-price ${isFree ? 'free' : ''}">${isFree ? 'Бесплатно' : c.price.toLocaleString('ru-RU') + ' ₽'}</div>
      <div class="case-buy" style="flex-direction:column; gap:5px;">
        ${isFree ? '' : `<select class="qty-select" ${isLocked?'disabled':''}>${Array.from({length:5},(_,i)=>`<option>${i+1}</option>`).join('')}</select>`}
        <div style="display:flex; gap:5px; width:100%;">
          <button class="btn buy-btn" ${onCooldown || isLocked ? 'disabled' : ''} style="flex:1;">${isLocked ? 'Заблокировано' : (onCooldown ? 'Ждите' : (isFree ? 'Получить' : 'Купить'))}</button>
          ${isFree ? '' : `<button class="btn gift-btn" ${onCooldown || isLocked ? 'disabled' : ''} style="flex:1; background:#b26bff;">🎁</button>`}
        </div>
      </div>`;
    grid.appendChild(card);
    
    card.querySelector('.buy-btn').onclick = () => {
      if (onCooldown || isLocked) return;
      if (isFree) buyCase(c, 1, false, false);
      else { 
        const qty = parseInt(card.querySelector('.qty-select').value); 
        if (state.balance < c.price * qty) return toast('Недостаточно средств'); 
        buyCase(c, qty, false, false); 
      }
    };

    const giftBtn = card.querySelector('.gift-btn');
    if (giftBtn) {
      giftBtn.onclick = () => {
        if (onCooldown || isLocked) return;
        const qty = parseInt(card.querySelector('.qty-select').value); 
        if (state.balance < c.price * qty) return toast('Недостаточно средств'); 
        buyCase(c, qty, false, true);
      };
    }
    if (!isFree && !onCooldown && !isLocked && state.balance < c.price) card.querySelector('.buy-btn').disabled = true;
  });
}

async function buyCase(caseObj, qty, isSyndicate = false, isGift = false) {
  try {
    let finalPrice = caseObj.price; 
    if (isSyndicate) finalPrice = Math.floor(caseObj.price * 0.7);
    const totalCost = finalPrice * qty;
    if (state.balance < totalCost) return toast('Недостаточно средств');
    await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-totalCost) });
    
    if (isSyndicate && Math.random() < 0.2) {
      const penalty = Math.floor(state.balance * 0.1);
      await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-penalty) });
      return toast(`Синдикат обманул! Штраф: -${penalty.toLocaleString('ru-RU')} ₽`);
    }

    const jpAmount = Math.floor(totalCost * 0.01);
    const jpRef = doc(db, 'settings', 'globalJackpot');
    const jpDoc = await getDoc(jpRef);
    if (jpDoc.exists()) await updateDoc(jpRef, { amount: increment(jpAmount) }); else await setDoc(jpRef, { amount: jpAmount });

    if (isGift) {
      window.openGiftFriendSelect(caseObj, qty);
    } else {
      for (let i = 0; i < qty; i++) {
        await addDoc(collection(db, 'inventory', currentUser.uid, 'items'), {
          type: 'case', caseId: caseObj.id, caseName: caseObj.name, icon: caseObj.icon, createdAt: serverTimestamp()
        });
      }
      toast(`Куплено ${qty} × ${caseObj.name}. Загляни в инвентарь!`);
    }
  } catch (e) { console.error(e); toast('Ошибка покупки'); }
}

window.openGiftFriendSelect = (caseObj, qty) => {
  $('friendsModal').classList.add('active');
  const title = $('friendsModal').querySelector('h2');
  if (title) title.textContent = '🎁 Кому подарить кейс?';
  const list = $('friendsList');
  if (state.friends.length === 0) {
    list.innerHTML = '<div class="inv-empty">У вас нет друзей.</div>';
    return;
  }
  list.innerHTML = state.friends.map(f => `
    <div class="friend-item" style="display:flex; align-items:center; gap:10px; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; margin-bottom:8px;">
      <div class="friend-avatar" style="width:36px; height:36px; border-radius:50%; background:#b26bff; display:flex; align-items:center; justify-content:center; font-weight:bold;">${(f.username||'?')[0].toUpperCase()}</div>
      <div style="flex:1; font-weight:bold;">${f.username}</div>
      <button class="btn" style="width:auto; padding:6px 12px; background:#22c55e;" onclick="window.sendGiftToFriend('${f.uid}', '${f.username}', '${caseObj.id}', ${qty})">Подарить</button>
    </div>
  `).join('');
};

window.sendGiftToFriend = async (toUid, toName, caseId, qty) => {
  const c = CASES[caseId];
  try {
    for (let i = 0; i < qty; i++) {
      await addDoc(collection(db, 'inventory', toUid, 'items'), {
        type: 'case', caseId: c.id, caseName: c.name, icon: c.icon, from: currentUser.username, createdAt: serverTimestamp()
      });
    }
    toast(`Кейс "${c.name}" подарен игроку ${toName}!`);
    $('friendsModal').classList.remove('active');
  } catch (e) { console.error(e); toast('Ошибка подарка'); }
};

export function runRoulette(caseObj, prize, onComplete = null, isSchool = false) {
  const overlay = $('overlay'), strip = $('strip'), roulette = $('roulette'), resultBig = $('resultBig'), sellBtn = $('sellBtn');
  if (!overlay) { if (onComplete) onComplete(); return; }
  overlay.classList.add('active'); resultBig.textContent = ''; resultBig.className = 'result-big'; sellBtn.style.display = 'none';
  const SLOT_W = 112, SLOT_COUNT = 80, WIN_INDEX = 70, slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) slots.push(i === WIN_INDEX ? prize : caseObj.drops[Math.floor(Math.random()*caseObj.drops.length)]);
  strip.innerHTML = slots.map(d => `
    <div class="slot ${rarityClass(d)}"><div class="em">${dropEmoji(d)}</div><div>${d.amount.toLocaleString('ru-RU')} ${isSchool ? '📄' : '₽'}</div></div>`).join('');
  const viewW = roulette.clientWidth, targetX = -(WIN_INDEX * SLOT_W + SLOT_W/2 - viewW/2), startX = -(2 * SLOT_W);
  strip.style.transform = `translateX(${startX}px)`;
  const DURATION = 5000, startTime = performance.now(), easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  function frame(now) {
    const t = Math.min(1, (now - startTime) / DURATION);
    strip.style.transform = `translateX(${startX + (targetX - startX) * easeOutQuint(t)}px)`;
    if (t < 1) requestAnimationFrame(frame); else finish();
  }
  requestAnimationFrame(frame);
  function finish() {
    resultBig.className = 'result-big pop ' + (prize.globalJackpot ? 'rarity-jackpot' : rarityClass(prize));
    resultBig.textContent = `+${prize.amount.toLocaleString('ru-RU')} ${isSchool ? '📄' : '₽'}${prize.globalJackpot ? ' 👑 ДЖЕКПОТ!' : ''}`;
    sellBtn.style.display = ''; sellBtn.textContent = 'Забрать';
    sellBtn.onclick = () => { overlay.classList.remove('active'); if (onComplete) onComplete(); };
  }
}

/* ==================== АПГРЕЙДЕР ==================== */
const upModal = $('upgradeModal'), upAmount = $('upAmount'), upChance = $('upChance'), upStartBtn = $('upStartBtn');
if ($('upgradeBtn')) {
  $('upgradeBtn').onclick = () => {
    $('upBalance').textContent = state.balance.toLocaleString('ru-RU') + ' ₽';
    upAmount.value = ''; upChance.value = 50; updateUpCalc();
    $('upAnimBar').style.display = 'none'; upStartBtn.disabled = false; upStartBtn.textContent = 'КРУТИТЬ 🎰';
    upModal.classList.add('active');
  };
}
if ($('closeUpgrade')) $('closeUpgrade').onclick = () => upModal.classList.remove('active');
function updateUpCalc() {
  const chance = parseInt(upChance.value);
  $('upChanceText').textContent = chance + '%'; $('upMultiText').textContent = 'x' + (100 / chance).toFixed(2);
  const amount = parseFloat(upAmount.value) || 0;
  $('upWinAmount').textContent = Math.floor(amount * (100 / chance)).toLocaleString('ru-RU') + ' ₽';
}
if (upChance) upChance.oninput = updateUpCalc;
if (upAmount) upAmount.oninput = updateUpCalc;
if ($('upMaxBtn')) $('upMaxBtn').onclick = () => { upAmount.value = state.balance; updateUpCalc(); };
if (upStartBtn) {
  upStartBtn.onclick = async () => {
    const amount = parseFloat(upAmount.value), chance = parseInt(upChance.value);
    if (!amount || amount <= 0) return toast('Введите сумму');
    if (amount > state.balance) return toast('Недостаточно средств');
    upStartBtn.disabled = true; upStartBtn.textContent = 'ИГРАЕМ...'; $('upAnimBar').style.display = 'block';
    await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-amount) });
    const animInterval = setInterval(() => { $('upAnimFill').style.width = Math.random() * 100 + '%'; }, 100);
    setTimeout(async () => {
      clearInterval(animInterval); $('upAnimFill').style.width = '0%';
      const isWin = Math.random() * 100 < chance;
      if (isWin) {
        const winAmount = Math.floor(amount * (100 / chance));
        await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(winAmount) });
        $('upAnimFill').style.background = '#22c55e'; $('upAnimFill').style.width = '100%';
        toast(`Победа! +${winAmount.toLocaleString('ru-RU')} ₽`);
      } else {
        $('upAnimFill').style.background = '#ff6b6b'; $('upAnimFill').style.width = '100%';
        toast(`Проигрыш ${amount.toLocaleString('ru-RU')} ₽`);
      }
      setTimeout(() => {
        upStartBtn.disabled = false; upStartBtn.textContent = 'КРУТИТЬ 🎰';
        $('upAnimBar').style.display = 'none'; $('upAnimFill').style.background = '#4da6ff';
        $('upBalance').textContent = state.balance.toLocaleString('ru-RU') + ' ₽'; upAmount.value = ''; updateUpCalc();
      }, 1500);
    }, 2000);
  };
}

/* ==================== КОЛЕСО ==================== */
const WHEEL_COOLDOWN = 24 * 60 * 60 * 1000;
const WHEEL_PRIZES = [
  { type: 'money', amount: 1000, weight: 30, label: '1 000 ₽' }, { type: 'money', amount: 5000, weight: 25, label: '5 000 ₽' },
  { type: 'money', amount: 15000, weight: 15, label: '15 000 ₽' }, { type: 'xp', amount: 100, weight: 15, label: '100 XP' },
  { type: 'xp', amount: 500, weight: 10, label: '500 XP' }, { type: 'empty', amount: 0, weight: 4, label: 'Пусто' },
  { type: 'money', amount: 100000, weight: 1, label: '100 000 ₽' }
];
let isSpinning = false;
if ($('wheelBtn')) $('wheelBtn').onclick = () => { $('wheelModal').classList.add('active'); checkWheelCooldown(); };
if ($('closeWheel')) $('closeWheel').onclick = () => $('wheelModal').classList.remove('active');
function checkWheelCooldown() {
  const btn = $('spinWheelBtn'); if (!btn) return;
  const lastSpin = state.userData.lastWheel ? state.userData.lastWheel.toMillis() : 0;
  const now = Date.now();
  if (now - lastSpin < WHEEL_COOLDOWN && lastSpin !== 0) {
    const left = WHEEL_COOLDOWN - (now - lastSpin);
    btn.disabled = true; btn.textContent = `ЖДИТЕ: ${Math.floor(left/3600000)}ч ${Math.floor((left%3600000)/60000)}м`; btn.style.background = '#4b5563';
  } else { btn.disabled = false; btn.textContent = 'КРУТИТЬ БЕСПЛАТНО'; btn.style.background = 'linear-gradient(145deg, #b26bff, #7c3aed)'; }
}
setInterval(() => { if ($('wheelModal')?.classList.contains('active') && !isSpinning) checkWheelCooldown(); }, 1000);
function getRandomPrize() {
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0); let r = Math.random() * total;
  for (const p of WHEEL_PRIZES) { if (r < p.weight) return p; r -= p.weight; }
  return WHEEL_PRIZES[0];
}
if ($('spinWheelBtn')) {
  $('spinWheelBtn').onclick = async () => {
    if (isSpinning) return;
    const lastSpin = state.userData.lastWheel ? state.userData.lastWheel.toMillis() : 0;
    if (Date.now() - lastSpin < WHEEL_COOLDOWN && lastSpin !== 0) return;
    isSpinning = true; const btn = $('spinWheelBtn');
    btn.disabled = true; btn.textContent = 'КРУТИМ...'; $('wheelResult').textContent = '';
    $('wheelGraphic').style.transform = `rotate(${1080 + Math.floor(Math.random() * 360)}deg)`;
    const prize = getRandomPrize();
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { lastWheel: serverTimestamp() });
        if (prize.type === 'money') {
          await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(prize.amount) });
          $('wheelResult').textContent = `Выиграли ${prize.label}!`; $('wheelGraphic').textContent = '💰';
        } else if (prize.type === 'xp') {
          const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
          await updateDoc(doc(db, 'users', currentUser.uid), { xp: increment(prize.amount) });
          $('wheelResult').textContent = `Получили ${prize.label}!`; $('wheelGraphic').textContent = '⭐';
          checkLevelUp((uDoc.data().xp || 0) + prize.amount);
        } else { $('wheelResult').textContent = 'Пусто!'; $('wheelGraphic').textContent = '😢'; }
      } catch (e) { console.error(e); }
      finally {
        isSpinning = false;
        setTimeout(() => { $('wheelGraphic').style.transition = 'none'; $('wheelGraphic').style.transform = 'rotate(0deg)'; setTimeout(() => $('wheelGraphic').style.transition = 'transform 3s', 50); }, 500);
        checkWheelCooldown();
      }
    }, 3000);
  };
}

/* ==================== КРАФТ ==================== */
const CRAFT_CASES = [
  { id: 'exclusive_1', name: 'Эксклюзивный 1', icon: '📦', cost: 25000, type: 'case' },
  { id: 'exclusive_2', name: 'Эксклюзивный 2', icon: '🎁', cost: 50000, type: 'case' },
  { id: 'exclusive_3', name: 'Эксклюзивный 3', icon: '💎', cost: 100000, type: 'case' },
  { id: 'exclusive_4', name: 'Эксклюзивный 4', icon: '🔮', cost: 250000, type: 'case' },
  { id: 'tester', name: 'Кейс Тестера', icon: '🛠️', cost: 1000000, type: 'case' },
  { id: 'av_wolf', name: 'Волк', icon: '🐺', cost: 15000, type: 'avatar', iconId: '🐺' },
  { id: 'av_devil', name: 'Дьявол', icon: '😈', cost: 75000, type: 'avatar', iconId: '😈' },
  { id: 'av_skull', name: 'Череп', icon: '💀', cost: 200000, type: 'avatar', iconId: '💀' },
  { id: 'av_ufo', name: 'НЛО', icon: '🛸', cost: 500000, type: 'avatar', iconId: '🛸' },
  { id: 'fr_red', name: 'Кровавая', icon: '🟥', cost: 30000, type: 'frame', frameStyle: '0 0 20px #ff0000' },
  { id: 'fr_toxic', name: 'Токсичная', icon: '🟩', cost: 100000, type: 'frame', frameStyle: '0 0 20px #39ff14' },
  { id: 'fr_gold', name: 'Королевская', icon: '🟨', cost: 300000, type: 'frame', frameStyle: '0 0 30px #ffd700, 0 0 10px #ffaa00' },
  { id: 'fr_galaxy', name: 'Галактическая', icon: '🪐', cost: 750000, type: 'frame', frameStyle: '0 0 25px #4da6ff, 0 0 40px #b26bff' }
];
const CRAFT_DROPS = {
  exclusive_1: [{ amount: 50000, chance: 50 }, { amount: 150000, chance: 30 }, { amount: 500000, chance: 15 }, { amount: 2000000, chance: 5, jackpot: true }],
  exclusive_2: [{ amount: 250000, chance: 45 }, { amount: 800000, chance: 30 }, { amount: 2500000, chance: 20 }, { amount: 10000000, chance: 5, jackpot: true }],
  exclusive_3: [{ amount: 1000000, chance: 40 }, { amount: 5000000, chance: 35 }, { amount: 20000000, chance: 20 }, { amount: 100000000, chance: 5, jackpot: true }],
  exclusive_4: [{ amount: 5000000, chance: 40 }, { amount: 25000000, chance: 30 }, { amount: 100000000, chance: 20 }, { amount: 500000000, chance: 8, big: true }, { amount: 2000000000, chance: 2, jackpot: true }],
  tester: [{ amount: 5000000, chance: 50 }, { amount: 25000000, chance: 30 }, { amount: 100000000, chance: 15 }, { amount: 1000000000, chance: 5, jackpot: true }]
};

window.CRAFT_CASES = CRAFT_CASES;
window.CRAFT_DROPS = CRAFT_DROPS;

if ($('craftBtn')) $('craftBtn').onclick = () => { updateCraftUI(); $('craftModal').classList.add('active'); };
if ($('closeCraft')) $('closeCraft').onclick = () => $('craftModal').classList.remove('active');

function updateCraftUI() {
  const shards = state.userData.shards || 0;
  if ($('craftShards')) $('craftShards').textContent = shards.toLocaleString('ru-RU') + ' 🔹';
  const list = $('craftList'); if (!list) return;
  const casesHtml = CRAFT_CASES.filter(c => c.type === 'case').map(c => renderCraftItem(c, shards)).join('');
  const avatarsHtml = CRAFT_CASES.filter(c => c.type === 'avatar').map(c => renderCraftItem(c, shards)).join('');
  const framesHtml = CRAFT_CASES.filter(c => c.type === 'frame').map(c => renderCraftItem(c, shards)).join('');

  list.innerHTML = `
    <div class="section-title" style="margin-top:0;">📦 Кейсы</div>
    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">${casesHtml}</div>
    <div class="section-title">🖼 Аватарки</div>
    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">${avatarsHtml}</div>
    <div class="section-title">🖼 Рамки</div>
    <div style="display:flex; flex-direction:column; gap:8px;">${framesHtml}</div>
  `;
}

function renderCraftItem(c, shards) {
  let isOwned = false;
  if (c.type === 'avatar') isOwned = (state.userData.ownedAvatars || []).includes(c.id);
  if (c.type === 'frame') isOwned = (state.userData.ownedFrames || []).includes(c.id);

  const can = shards >= c.cost && !isOwned;
  const btnText = isOwned ? 'Куплено' : 'Скрафтить';
  const btnColor = isOwned ? '#4b5563' : (can ? 'linear-gradient(145deg, #b26bff, #7c3aed)' : '#4b5563');
  
  let iconHtml = `<div style="font-size:2rem;">${c.icon}</div>`;
  if (c.type === 'frame') iconHtml = `<div style="width:36px; height:36px; border-radius:50%; background:#16203a; border:2px solid #fff; box-shadow:${c.frameStyle}; margin:0 auto;"></div>`;

  return `<div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px;">
    <div style="width:40px; text-align:center;">${iconHtml}</div>
    <div style="flex:1;"><div style="font-weight:bold;">${c.name}</div><div style="font-size:0.8rem; color:#b26bff;">${c.cost.toLocaleString('ru-RU')} 🔹</div></div>
    <button class="btn" style="width:auto; padding:8px 14px; background:${btnColor};" ${can ? '' : 'disabled'} onclick="window.craftItem('${c.id}', ${c.cost}, '${c.type}', '${c.iconId || c.frameStyle || ''}')">${btnText}</button>
  </div>`;
}

window.craftItem = async (id, cost, type, data) => {
  if ((state.userData.shards || 0) < cost) return toast('Мало осколков!');
  
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { shards: increment(-cost) });
    
    if (type === 'case') {
      await addDoc(collection(db, 'inventory', currentUser.uid, 'items'), {
        type: 'case', caseId: id, caseName: CRAFT_CASES.find(c => c.id === id).name, icon: CRAFT_CASES.find(c => c.id === id).icon, createdAt: serverTimestamp()
      });
      toast('Кейс скрафчен! Он в инвентаре.');
    } 
    else if (type === 'avatar') {
      await updateDoc(doc(db, 'users', currentUser.uid), { ownedAvatars: arrayUnion(id) });
      await addDoc(collection(db, 'inventory', currentUser.uid, 'items'), {
        type: 'avatar', name: CRAFT_CASES.find(c => c.id === id).name, icon: data, createdAt: serverTimestamp()
      });
      toast('Аватарка скрафчена! Надень её в инвентаре.');
    } 
    else if (type === 'frame') {
      await updateDoc(doc(db, 'users', currentUser.uid), { ownedFrames: arrayUnion(id) });
      await addDoc(collection(db, 'inventory', currentUser.uid, 'items'), {
        type: 'frame', name: CRAFT_CASES.find(c => c.id === id).name, frameId: id, frameStyle: data, createdAt: serverTimestamp()
      });
      toast('Рамка скрафчена! Надень её в инвентаре.');
    }
    
    updateCraftUI();
  } catch (e) { console.error(e); toast('Ошибка крафта'); }
};

/* ==================== ПРЕСТИЖ ==================== */
if ($('prestigeBtn')) {
  $('prestigeBtn').onclick = async () => {
    if (state.level < 500) return toast('Нужен 500 уровень!');
    if (!confirm('Обнулить прогресс и получить престиж?')) return;
    const newPrestige = (state.userData.prestige || 0) + 1;
    await updateDoc(doc(db, 'users', currentUser.uid), { balance: 0, level: 1, xp: 0, prestige: newPrestige });
    state.balance = 0; state.level = 1; state.xp = 0; state.userData.prestige = newPrestige;
    updateBalanceUI(); $('profPrestige').textContent = newPrestige; $('profLevel').textContent = 'Уровень 1';
    toast(`🌟 Престиж: ${newPrestige}`); $('profileModal').classList.remove('active'); renderCases();
  };
}

/* ==================== КАСТОМИЗАЦИЯ (МАГАЗИН) ==================== */
const AVATARS = [
  { id: 'default', icon: '👤', price: 0, name: 'Стандарт' },
  { id: 'cat', icon: '🐱', price: 50000, name: 'Котик' },
  { id: 'dog', icon: '🐶', price: 50000, name: 'Собачка' },
  { id: 'lion', icon: '🦁', price: 250000, name: 'Лев' },
  { id: 'dragon', icon: '🐉', price: 1000000, name: 'Дракон' },
  { id: 'alien', icon: '👽', price: 5000000, name: 'Пришелец' },
  { id: 'god', icon: '🗿', price: 100000000, name: 'Божество' },
  { id: 'void', icon: '🕳️', price: 1000000000, name: 'Пустота' }
];
const FRAMES = [
  { id: 'none', style: 'none', price: 0, name: 'Без рамки' },
  { id: 'blue', style: '0 0 10px #4da6ff', price: 100000, name: 'Синяя' },
  { id: 'gold', style: '0 0 15px #ffd700', price: 500000, name: 'Золотая' },
  { id: 'neon', style: '0 0 20px #b26bff', price: 2000000, name: 'Неоновая' },
  { id: 'fire', style: '0 0 25px #ff4500, 0 0 10px #ff0000', price: 10000000, name: 'Огненная' },
  { id: 'cosmic', style: '0 0 30px #00ffff, 0 0 10px #ff00ff', price: 100000000, name: 'Космическая' },
  { id: 'void_frame', style: '0 0 40px #000, 0 0 20px #fff', price: 1000000000, name: 'Абсолютная' },
  { id: 'fr_red', style: '0 0 20px #ff0000', name: 'Кровавая' },
  { id: 'fr_toxic', style: '0 0 20px #39ff14', name: 'Токсичная' },
  { id: 'fr_gold', style: '0 0 30px #ffd700, 0 0 10px #ffaa00', name: 'Королевская' },
  { id: 'fr_galaxy', style: '0 0 25px #4da6ff, 0 0 40px #b26bff', name: 'Галактическая' },
  { id: 'sf_1', style: '0 0 15px #4da6ff', name: 'Синяя (Школа)' },
  { id: 'sf_2', style: '0 0 20px #ff9800', name: 'Оранжевая (Школа)' },
  { id: 'sf_3', style: '0 0 25px #e91e63', name: 'Розовая (Школа)' },
  { id: 'sf_4', style: '0 0 30px #ffd700, 0 0 10px #ffaa00', name: 'Золотая (Школа)' },
  { id: 'sf_5', style: '0 0 35px #9c27b0, 0 0 15px #4da6ff', name: 'Выпускник (Школа)' }
];

let shopTab = 'money';

function initShop() {
  if (!$('shopAvatars') || !$('shopFrames')) return;
  const shopModalBox = $('shopModal').querySelector('.modal-box');
  if (!document.getElementById('shopTabs')) {
    const tabs = document.createElement('div');
    tabs.id = 'shopTabs'; tabs.style = 'display:flex; gap:10px; margin-bottom:15px;';
    tabs.innerHTML = `<button class="btn" id="tabMoney" style="flex:1; background:linear-gradient(145deg, #3d8bff, #2563eb)">💰 За деньги</button><button class="btn" id="tabShards" style="flex:1; background:#24344f">🔹 За осколки</button>`;
    shopModalBox.insertBefore(tabs, shopModalBox.children[2]);
    $('tabMoney').onclick = () => { $('tabMoney').style.background = 'linear-gradient(145deg, #3d8bff, #2563eb)'; $('tabShards').style.background = '#24344f'; shopTab = 'money'; initShop(); };
    $('tabShards').onclick = () => { $('tabShards').style.background = 'linear-gradient(145deg, #b26bff, #7c3aed)'; $('tabMoney').style.background = '#24344f'; shopTab = 'shards'; initShop(); };
  }

  $('shopAvatars').innerHTML = AVATARS.filter(a => shopTab === 'money' ? (a.price > 0 || a.id === 'default') : a.shardPrice > 0).map(a => {
    const owned = (state.userData.ownedAvatars || []).includes(a.id) || (a.price === 0 && a.shardPrice === undefined);
    const equipped = (state.userData.avatar || '👤') === a.icon;
    const costText = shopTab === 'money' ? `${a.price.toLocaleString('ru-RU')} ₽` : `${(a.shardPrice || 0).toLocaleString('ru-RU')} 🔹`;
    return `<div style="text-align:center; cursor:pointer; padding:10px; background:${equipped ? 'rgba(77,166,255,0.2)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${equipped ? '#4da6ff' : '#24344f'}; border-radius:10px;" onclick="window.buyAvatar('${a.id}', ${a.price || 0}, ${a.shardPrice || 0}, '${a.icon}')">
      <div style="font-size:2rem;">${a.icon}</div><div style="font-size:0.75rem; color:#fff; margin-top:5px;">${a.name}</div>
      <div style="font-size:0.75rem; color:${owned ? '#22c55e' : (shopTab === 'money' ? '#ffd700' : '#b26bff')}; font-weight:bold;">${owned ? (equipped ? 'Надето' : 'Куплено') : costText}</div></div>`;
  }).join('');

  $('shopFrames').innerHTML = FRAMES.filter(f => shopTab === 'money' ? (f.price > 0 || f.id === 'none') : f.shardPrice > 0).map(f => {
    const owned = (state.userData.ownedFrames || []).includes(f.id) || (f.price === 0 && f.shardPrice === undefined);
    const equipped = (state.userData.frame || 'none') === f.id;
    const costText = shopTab === 'money' ? `${f.price.toLocaleString('ru-RU')} ₽` : `${(f.shardPrice || 0).toLocaleString('ru-RU')} 🔹`;
    return `<div style="text-align:center; cursor:pointer; padding:10px; background:${equipped ? 'rgba(77,166,255,0.2)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${equipped ? '#4da6ff' : '#24344f'}; border-radius:10px;" onclick="window.buyFrame('${f.id}', ${f.price || 0}, ${f.shardPrice || 0}, '${f.style}')">
      <div style="width:40px; height:40px; border-radius:50%; background:#16203a; margin:0 auto; border:2px solid #fff; box-shadow:${f.style};"></div>
      <div style="font-size:0.75rem; color:#fff; margin-top:5px;">${f.name}</div>
      <div style="font-size:0.75rem; color:${owned ? '#22c55e' : (shopTab === 'money' ? '#ffd700' : '#b26bff')}; font-weight:bold;">${owned ? (equipped ? 'Надето' : 'Куплено') : costText}</div></div>`;
  }).join('');
}
if ($('shopBtn')) $('shopBtn').onclick = () => { initShop(); $('shopModal').classList.add('active'); };
if ($('closeShop')) $('closeShop').onclick = () => $('shopModal').classList.remove('active');

window.buyAvatar = async (id, price, shardPrice, icon) => {
  const owned = (state.userData.ownedAvatars || []).includes(id) || (price === 0 && shardPrice === 0);
  if (!owned) {
    if (price > 0) {
      if (state.balance < price) return toast('Недостаточно денег!');
      await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-price), ownedAvatars: arrayUnion(id) });
    } else if (shardPrice > 0) {
      if ((state.userData.shards || 0) < shardPrice) return toast('Недостаточно осколков!');
      await updateDoc(doc(db, 'users', currentUser.uid), { shards: increment(-shardPrice), ownedAvatars: arrayUnion(id) });
    }
    
    await addDoc(collection(db, 'inventory', currentUser.uid, 'items'), {
      type: 'avatar', name: AVATARS.find(a => a.id === id).name || 'Аватарка', icon: icon, createdAt: serverTimestamp()
    });
    toast('Аватарка куплена! Надень её в инвентаре.');
  } else {
    await updateDoc(doc(db, 'users', currentUser.uid), { avatar: icon });
    toast('Аватарка надета!');
  }
  initShop();
};

window.buyFrame = async (id, price, shardPrice, style) => {
  const owned = (state.userData.ownedFrames || []).includes(id) || (price === 0 && shardPrice === 0);
  if (!owned) {
    if (price > 0) {
      if (state.balance < price) return toast('Недостаточно денег!');
      await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-price), ownedFrames: arrayUnion(id) });
    } else if (shardPrice > 0) {
      if ((state.userData.shards || 0) < shardPrice) return toast('Недостаточно осколков!');
      await updateDoc(doc(db, 'users', currentUser.uid), { shards: increment(-shardPrice), ownedFrames: arrayUnion(id) });
    }
    
    await addDoc(collection(db, 'inventory', currentUser.uid, 'items'), {
      type: 'frame', name: FRAMES.find(f => f.id === id).name || 'Рамка', frameId: id, frameStyle: style, createdAt: serverTimestamp()
    });
    toast('Рамка куплена! Надень её в инвентаре.');
  } else {
    await updateDoc(doc(db, 'users', currentUser.uid), { frame: id });
    toast('Рамка надета!');
  }
  initShop();
};

/* ==================== ПРОФИЛЬ ==================== */
if ($('profileBtn')) {
  $('profileBtn').onclick = () => {
    $('profName').textContent = currentUser.username;
    $('profLevel').textContent = `Уровень ${state.level} (${state.xp % 1000} / ${Math.floor(50 * Math.pow(state.level, 2.5))} XP)`;
    $('profPrestige').textContent = state.userData.prestige || 0;
    const av = state.userData.avatar || '👤';
    const frameStyle = FRAMES.find(f => f.id === (state.userData.frame || 'none'))?.style || 'none';
    let profAvEl = $('profAvatar');
    if (!profAvEl) {
      profAvEl = document.createElement('div');
      profAvEl.id = 'profAvatar';
      profAvEl.style = 'width:80px; height:80px; border-radius:50%; background:#16203a; margin:0 auto 10px; display:flex; align-items:center; justify-content:center; font-size:3rem;';
      $('profName').parentNode.insertBefore(profAvEl, $('profName'));
    }
    profAvEl.textContent = av; profAvEl.style.boxShadow = frameStyle;
    if ($('prestigeBtn')) {
      if (state.level >= 500) { $('prestigeBtn').disabled = false; $('prestigeBtn').textContent = 'Переродиться'; }
      else { $('prestigeBtn').disabled = true; $('prestigeBtn').textContent = `Нужен 500 ур.`; }
    }
    checkAchievements();
    const ql = $('questsList');
    if (ql && state.userData.quests) {
      ql.innerHTML = DAILY_QUESTS.map(q => `<div style="margin-bottom:8px; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px;">
        <div>${q.title} (${state.userData.quests[q.id]?.progress || 0}/${q.target})</div>
        <div style="font-size:0.75rem; color:#8ba3c7;">Награда: ${q.rewardMoney}₽ + ${q.rewardXp}XP</div></div>`).join('');
    }
    $('profileModal').classList.add('active');
  };
}
if ($('closeProfile')) $('closeProfile').onclick = () => $('profileModal').classList.remove('active');

/* ==================== UI КНОПКИ ==================== */
const logoutBtn = $('logoutBtn'); if (logoutBtn) logoutBtn.onclick = () => signOut(auth).then(() => location.href = 'index.html');
const lbBtn = $('lbBtn'); if (lbBtn) lbBtn.onclick = () => openLeaderboard();
const closeLb = $('closeLb'); if (closeLb) closeLb.onclick = () => $('lbModal').classList.remove('active');
const friendsBtn = $('friendsBtn'); if (friendsBtn) friendsBtn.onclick = () => $('friendsModal').classList.add('active');
const closeFriends = $('closeFriends'); if (closeFriends) closeFriends.onclick = () => $('friendsModal').classList.remove('active');
const closeChat = $('closeChat'); if (closeChat) closeChat.onclick = () => $('chatModal').classList.remove('active');
const closeGift = $('closeGift'); if (closeGift) closeGift.onclick = () => $('giftModal').classList.remove('active');
const promoBtn = $('promoBtn'); if (promoBtn) promoBtn.onclick = () => { usePromo($('promoInput').value); $('promoInput').value = ''; };
if ($('clanBtn')) $('clanBtn').onclick = () => $('clanModal').classList.add('active');
if ($('closeClan')) $('closeClan').onclick = () => $('clanModal').classList.remove('active');
if ($('globalChatBtn')) $('globalChatBtn').onclick = () => $('globalChatModal').classList.add('active');
if ($('closeGlobalChat')) $('closeGlobalChat').onclick = () => $('globalChatModal').classList.remove('active');

if ($('collectionBtn')) $('collectionBtn').onclick = () => {
  const list = $('collectionList'); if (!list) return; list.innerHTML = '';
  Object.values(CASES).forEach(c => {
    const has = (state.userData.openedCases || []).includes(c.id);
    list.innerHTML += `<div style="text-align:center; padding:10px; background:${has ? 'rgba(77,166,255,0.2)' : 'rgba(0,0,0,0.3)'}; border-radius:10px; opacity:${has ? 1 : 0.3};">
      <div style="font-size:2rem;">${c.icon}</div><div style="font-size:0.7rem;">${c.name}</div></div>`;
  });
  $('collectionModal').classList.add('active');
};
if ($('closeCollection')) $('closeCollection').onclick = () => $('collectionModal').classList.remove('active');

if ($('syndicateBtn')) $('syndicateBtn').onclick = () => {
  if (state.level < 50) return toast('Нужен 50 уровень!');
  const list = $('syndicateList'); if (!list) return; list.innerHTML = '';
  Object.values(CASES).forEach(c => {
    if (c.price > 0) {
      list.innerHTML += `<div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,0,0,0.1); border-radius:10px;">
        <div style="font-size:1.5rem;">${c.icon}</div>
        <div style="flex:1;"><div>${c.name}</div><div style="color:#ff6b6b; font-size:0.8rem;">-30%</div></div>
        <button class="btn" style="width:auto; padding:5px 10px; background:#dc2626;" onclick="window.buySyndicate('${c.id}')">Купить</button></div>`;
    }
  });
  $('syndicateModal').classList.add('active');
};
if ($('closeSyndicate')) $('closeSyndicate').onclick = () => $('syndicateModal').classList.remove('active');
window.buySyndicate = (id) => { buyCase(CASES[id], 1, true); $('syndicateModal').classList.remove('active'); };

function renderStats() {
  const s = JSON.parse(localStorage.getItem('co3_stats') || 'null') || { opened: 0, earned: 0, best: 0 };
  if ($('stats')) $('stats').innerHTML = `
    <div class="stat-card"><div class="s-label">Открыто</div><div class="s-value">${s.opened}</div></div>
    <div class="stat-card"><div class="s-label">Выиграно</div><div class="s-value plus">${s.earned.toLocaleString('ru-RU')} ₽</div></div>
    <div class="stat-card"><div class="s-label">Лучший дроп</div><div class="s-value gold">${s.best.toLocaleString('ru-RU')} ₽</div></div>`;
}
function recordOpenStat(amount) {
  const s = JSON.parse(localStorage.getItem('co3_stats') || 'null') || { opened: 0, earned: 0, best: 0 };
  s.opened++; s.earned += amount; if (amount > s.best) s.best = amount;
  localStorage.setItem('co3_stats', JSON.stringify(s)); renderStats();
}