import { db } from './firebase-config.js';
import { collection, doc, onSnapshot, deleteDoc, updateDoc, increment, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast, runRoulette } from './game.js';
import { CASES, rollDrop } from './cases-data.js';
import { checkLevelUp } from './quests.js'; // Импорт проверки уровня

const $ = id => document.getElementById(id);
let inventoryItems = [];
let activeTab = 'cases';

export function initInventory() {
  if (!currentUser) return;

  if ($('invBtn')) {
    $('invBtn').onclick = () => {
      $('inventoryModal').classList.add('active');
      renderInventory();
    };
  }
  if ($('closeInventory')) {
    $('closeInventory').onclick = () => $('inventoryModal').classList.remove('active');
  }

  const itemsRef = collection(db, 'inventory', currentUser.uid, 'items');
  onSnapshot(itemsRef, (snap) => {
    inventoryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if ($('inventoryModal').classList.contains('active')) {
      renderInventory();
    }
  }, (error) => {
    console.error("Ошибка загрузки инвентаря:", error);
  });

  document.querySelectorAll('.inv-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderInventory();
    };
  });
}

function renderInventory() {
  const list = $('invList');
  if (!list) return;

  const filtered = inventoryItems.filter(i => {
    const type = i.type;
    return (activeTab === 'cases' && type === 'case') ||
           (activeTab === 'frames' && type === 'frame') ||
           (activeTab === 'avatar' && type === 'avatar');
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="inv-empty" style="text-align:center; padding:40px; color:#8ba3c7;">Пусто 🕸️</div>`;
    return;
  }

  list.innerHTML = filtered.map(item => {
    if (activeTab === 'cases') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="font-size:2rem;">${item.icon || '📦'}</div>
          <div style="flex:1;">
            <div style="font-weight:bold;">${item.caseName || 'Кейс'}</div>
            <div style="font-size:0.75rem; color:#8ba3c7;">1 шт.</div>
          </div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #3d8bff, #2563eb);" onclick="window.openCaseFromInv('${item.id}', '${item.caseId}')">Открыть</button>
          <button class="btn" style="width:auto; padding:6px 12px; background:#b26bff; margin-left:5px;" onclick="window.giftFromInv('${item.id}', '${item.caseId}')">🎁</button>
        </div>`;
    }
    if (activeTab === 'frames') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="width:40px; height:40px; border-radius:50%; background:#16203a; border:2px solid #fff; box-shadow:${item.frameStyle || 'none'};"></div>
          <div style="flex:1;"><div style="font-weight:bold;">${item.name}</div><div style="font-size:0.75rem; color:#8ba3c7;">Рамка</div></div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #b26bff, #7c3aed);" onclick="window.equipFrame('${item.id}', '${item.frameId}')">Надеть</button>
        </div>`;
    }
    if (activeTab === 'avatar') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="font-size:2rem;">${item.icon}</div>
          <div style="flex:1;"><div style="font-weight:bold;">${item.name}</div><div style="font-size:0.75rem; color:#8ba3c7;">Аватарка</div></div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #22c55e, #16a34a);" onclick="window.equipAvatar('${item.id}', '${item.icon}')">Надеть</button>
        </div>`;
    }
    return '';
  }).join('');
}

/* ==================== ОТКРЫТИЕ КЕЙСА ==================== */
window.openCaseFromInv = async (invItemId, caseId) => {
  let c = CASES[caseId];
  let isCraft = false;
  
  if (!c && window.CRAFT_CASES && window.CRAFT_DROPS) {
    const cc = window.CRAFT_CASES.find(x => x.id === caseId);
    if (cc) { c = { name: cc.name, drops: window.CRAFT_DROPS[caseId] }; isCraft = true; }
  }
  
  if (!c) return toast('Ошибка: кейс не найден');

  try {
    $('inventoryModal').classList.remove('active');
    await deleteDoc(doc(db, 'inventory', currentUser.uid, 'items', invItemId));
    
    const prize = rollDrop(c.drops);
    const shardsEarned = isCraft ? 0 : Math.max(1, Math.floor(500 / 1000));
    const xpGained = 10; // 10 XP за кейс

    // Начисляем деньги, осколки, опыт
    await updateDoc(doc(db, 'users', currentUser.uid), { 
      balance: increment(prize.amount),
      shards: increment(shardsEarned),
      totalOpened: increment(1),
      xp: increment(xpGained)
    });
    
    // Проверяем повышение уровня (берем текущий XP + прибавку)
    const newTotalXp = (state.userData.xp || 0) + xpGained;
    checkLevelUp(newTotalXp);

    runRoulette(c, prize, null, false);
  } catch (e) {
    console.error("Ошибка в openCaseFromInv:", e);
    toast('Ошибка открытия: ' + e.message);
  }
};

/* ==================== НАДЕВАНИЕ ==================== */
window.equipFrame = async (invItemId, frameId) => {
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { frame: frameId });
    await deleteDoc(doc(db, 'inventory', currentUser.uid, 'items', invItemId));
    toast('Рамка надета!');
    $('inventoryModal').classList.remove('active');
  } catch (e) { console.error(e); }
};

window.equipAvatar = async (invItemId, icon) => {
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { avatar: icon });
    await deleteDoc(doc(db, 'inventory', currentUser.uid, 'items', invItemId));
    toast('Аватарка надета!');
    $('inventoryModal').classList.remove('active');
  } catch (e) { console.error(e); }
};

/* ==================== ПОДАРОК ==================== */
window.giftFromInv = async (invItemId, caseId) => {
  $('inventoryModal').classList.remove('active');
  $('friendsModal').classList.add('active');
  
  const title = $('friendsModal').querySelector('h2');
  if (title) title.textContent = '🎁 Кому подарить кейс?';
  
  const list = $('friendsList');
  if (!state.friends || state.friends.length === 0) {
    list.innerHTML = '<div class="inv-empty">У вас нет друзей.</div>';
    return;
  }
  
  list.innerHTML = state.friends.map(f => `
    <div class="friend-item" style="display:flex; align-items:center; gap:10px; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; margin-bottom:8px;">
      <div class="friend-avatar" style="width:36px; height:36px; border-radius:50%; background:#b26bff; display:flex; align-items:center; justify-content:center; font-weight:bold;">${(f.username||'?')[0].toUpperCase()}</div>
      <div style="flex:1; font-weight:bold;">${f.username}</div>
      <button class="btn" style="width:auto; padding:6px 12px; background:#22c55e;" onclick="window.sendGiftFromInv('${f.uid}', '${f.username}', '${invItemId}', '${caseId}')">Подарить</button>
    </div>
  `).join('');
};

window.sendGiftFromInv = async (toUid, toName, invItemId, caseId) => {
  let cName = 'Кейс', cIcon = '📦';
  if (CASES[caseId]) { cName = CASES[caseId].name; cIcon = CASES[caseId].icon; }
  else if (window.CRAFT_CASES) {
    const cc = window.CRAFT_CASES.find(x => x.id === caseId);
    if (cc) { cName = cc.name; cIcon = cc.icon; }
  }

  try {
    await deleteDoc(doc(db, 'inventory', currentUser.uid, 'items', invItemId));
    await addDoc(collection(db, 'inventory', toUid, 'items'), {
      type: 'case', caseId: caseId, caseName: cName, icon: cIcon, from: currentUser.username, createdAt: serverTimestamp()
    });
    toast(`Кейс подарен игроку ${toName}!`);
    $('friendsModal').classList.remove('active');
  } catch (e) { console.error(e); toast('Ошибка подарка'); }
};