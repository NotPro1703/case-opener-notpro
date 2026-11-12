import { db } from './firebase-config.js';
import { collection, doc, onSnapshot, deleteDoc, updateDoc, arrayUnion, increment, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast, runRoulette } from './game.js';
import { CASES } from './cases-data.js';

const $ = id => document.getElementById(id);
let inventoryItems = [];
let activeTab = 'cases';

export function initInventory() {
  if (!currentUser) return;

  if ($('invBtn')) $('invBtn').onclick = () => { $('inventoryModal').classList.add('active'); };
  if ($('closeInventory')) $('closeInventory').onclick = () => $('inventoryModal').classList.remove('active');

  const itemsRef = collection(db, 'inventory', currentUser.uid, 'items');
  
  onSnapshot(itemsRef, (snap) => {
    inventoryItems = snap.docs.map(d => {
      const data = d.data();
      console.log("🔥 Загружен предмет:", data); // <-- Это покажет в консоли, что пришло из базы
      return { id: d.id, ...data };
    });
    
    // Если открыта модалка инвентаря, перерисовываем
    if ($('inventoryModal').classList.contains('active')) {
      renderInventory();
    }
  }, (error) => {
    console.error("❌ Ошибка чтения инвентаря:", error);
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

  // Фильтруем по типу (cases, frames, avatar)
  const filtered = inventoryItems.filter(i => i.type === activeTab);

  if (!filtered.length) {
    list.innerHTML = `<div class="inv-empty" style="text-align:center; padding:40px; color:#8ba3c7;">Пусто 🕸️</div>`;
    return;
  }

  list.innerHTML = filtered.map(item => {
    if (item.type === 'case') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="font-size:2rem;">${item.icon || '📦'}</div>
          <div style="flex:1;">
            <div style="font-weight:bold;">${item.caseName || 'Кейс'}</div>
            <div style="font-size:0.75rem; color:#8ba3c7;">1 шт.</div>
          </div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #3d8bff, #2563eb);" onclick="openCaseFromInv('${item.id}', '${item.caseId}')">Открыть</button>
          <button class="btn" style="width:auto; padding:6px 12px; background:#b26bff;" onclick="giftFromInv('${item.id}', '${item.caseId}')">🎁</button>
        </div>`;
    }
    if (item.type === 'frame') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="width:40px; height:40px; border-radius:50%; background:#16203a; border:2px solid #fff; box-shadow:${item.frameStyle || 'none'};"></div>
          <div style="flex:1;">
            <div style="font-weight:bold;">${item.name}</div>
            <div style="font-size:0.75rem; color:#8ba3c7;">Рамка</div>
          </div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #b26bff, #7c3aed);" onclick="equipFrame('${item.id}', '${item.frameId}')">Надеть</button>
        </div>`;
    }
    if (item.type === 'avatar') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="font-size:2rem;">${item.icon}</div>
          <div style="flex:1;">
            <div style="font-weight:bold;">${item.name}</div>
            <div style="font-size:0.75rem; color:#8ba3c7;">Аватарка</div>
          </div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #22c55e, #16a34a);" onclick="equipAvatar('${item.id}', '${item.icon}')">Надеть</button>
        </div>`;
    }
    return '';
  }).join('');
}

window.openCaseFromInv = async (invItemId, caseId) => {
  const c = CASES[caseId];
  if (!c) return toast('Ошибка: кейс не найден');
  
  try {
    await deleteDoc(doc(db, 'inventory', currentUser.uid, 'items', invItemId));
    const prize = rollDrop(c.drops);
    await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(prize.amount) });
    runRoulette(c, prize, null, false);
    $('inventoryModal').classList.remove('active');
  } catch (e) {
    console.error(e);
    toast('Ошибка открытия');
  }
};

window.equipFrame = async (invItemId, frameId) => {
  await updateDoc(doc(db, 'users', currentUser.uid), { frame: frameId });
  toast('Рамка надета!');
  $('inventoryModal').classList.remove('active');
};

window.equipAvatar = async (invItemId, icon) => {
  await updateDoc(doc(db, 'users', currentUser.uid), { avatar: icon });
  toast('Аватарка надета!');
  $('inventoryModal').classList.remove('active');
};

window.giftFromInv = async (invItemId, caseId) => {
  $('inventoryModal').classList.remove('active');
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
      <button class="btn" style="width:auto; padding:6px 12px; background:#22c55e;" onclick="sendGiftFromInv('${f.uid}', '${f.username}', '${invItemId}', '${caseId}')">Подарить</button>
    </div>
  `).join('');
};

window.sendGiftFromInv = async (toUid, toName, invItemId, caseId) => {
  const c = CASES[caseId];
  try {
    await deleteDoc(doc(db, 'inventory', currentUser.uid, 'items', invItemId));
    await addDoc(collection(db, 'inventory', toUid, 'items'), {
      type: 'case', caseId: c.id, caseName: c.name, icon: c.icon, from: currentUser.username, createdAt: serverTimestamp()
    });
    toast(`Кейс подарен игроку ${toName}!`);
    $('friendsModal').classList.remove('active');
  } catch (e) { console.error(e); toast('Ошибка подарка'); }
};