import { db } from './firebase-config.js';
import { collection, doc, onSnapshot, deleteDoc, updateDoc, arrayUnion, increment, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast, runRoulette } from './game.js';
import { CASES } from './cases-data.js';

const $ = id => document.getElementById(id);
let inventoryItems = [];
let activeTab = 'case'; // Используем 'case', 'frame', 'avatar'

export function initInventory() {
  if (!currentUser) return;

  if ($('invBtn')) $('invBtn').onclick = () => { 
    $('inventoryModal').classList.add('active'); 
    renderInventory(); // Перерисовываем при открытии
  };
  if ($('closeInventory')) $('closeInventory').onclick = () => $('inventoryModal').classList.remove('active');

  const itemsRef = collection(db, 'inventory', currentUser.uid, 'items');
  
  onSnapshot(itemsRef, (snap) => {
    inventoryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("🔥 ДАННЫЕ ИЗ ИНВЕНТАРЯ:", inventoryItems);
    
    // Принудительно обновляем список, если модалка открыта
    if ($('inventoryModal').classList.contains('active')) {
      renderInventory();
    }
  }, (error) => {
    console.error("❌ Ошибка Firestore:", error);
  });

  // Обработка вкладок
  document.querySelectorAll('.inv-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Приводим к одному виду (убираем 's' на конце, если есть)
      let type = tab.dataset.tab;
      if (type.endsWith('s')) type = type.slice(0, -1); 
      activeTab = type;
      renderInventory();
    };
  });
}

function renderInventory() {
  const list = $('invList');
  if (!list) return;

  // Сравниваем типы без учета 's' (case === cases)
  const filtered = inventoryItems.filter(i => {
    let itemType = i.type;
    if (itemType && itemType.endsWith('s')) itemType = itemType.slice(0, -1);
    return itemType === activeTab;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="inv-empty" style="text-align:center; padding:40px; color:#8ba3c7;">Пусто 🕸️</div>`;
    return;
  }

  list.innerHTML = filtered.map(item => {
    if (activeTab === 'case') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="font-size:2rem;">${item.icon || '📦'}</div>
          <div style="flex:1;">
            <div style="font-weight:bold;">${item.caseName || 'Кейс'}</div>
            <div style="font-size:0.75rem; color:#8ba3c7;">1 шт.</div>
          </div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #3d8bff, #2563eb);" onclick="openCaseFromInv('${item.id}', '${item.caseId}')">Открыть</button>
          <button class="btn" style="width:auto; padding:6px 12px; background:#b26bff; margin-left:5px;" onclick="giftFromInv('${item.id}', '${item.caseId}')">🎁</button>
        </div>`;
    }
    if (activeTab === 'frame') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="width:40px; height:40px; border-radius:50%; background:#16203a; border:2px solid #fff; box-shadow:${item.frameStyle || 'none'};"></div>
          <div style="flex:1;"><div style="font-weight:bold;">${item.name}</div><div style="font-size:0.75rem; color:#8ba3c7;">Рамка</div></div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #b26bff, #7c3aed);" onclick="equipFrame('${item.id}', '${item.frameId}')">Надеть</button>
        </div>`;
    }
    if (activeTab === 'avatar') {
      return `
        <div class="inv-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border:1px solid #24344f; border-radius:12px; margin-bottom:8px;">
          <div style="font-size:2rem;">${item.icon}</div>
          <div style="flex:1;"><div style="font-weight:bold;">${item.name}</div><div style="font-size:0.75rem; color:#8ba3c7;">Аватарка</div></div>
          <button class="btn" style="width:auto; padding:6px 12px; background:linear-gradient(145deg, #22c55e, #16a34a);" onclick="equipAvatar('${item.id}', '${item.icon}')">Надеть</button>
        </div>`;
    }
    return '';
  }).join('');
}