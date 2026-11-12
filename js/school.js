import { db } from './firebase-config.js';
import { doc, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast, runRoulette } from './game.js';

const $ = id => document.getElementById(id);

const START_POINTS = 100;

// ИСПРАВЛЕННЫЙ физкультурный кейс (минимум 100 📄)
const CASES = [
  { id: 'phys_edu', name: 'Физкультурный', icon: '⚽', price: 100, drops: [{ amount: 100, chance: 50 }, { amount: 250, chance: 30 }, { amount: 350, chance: 15 }, { amount: 750, chance: 4 }, { amount: 5000, chance: 1 }] },
  { id: 'math', name: 'Математический', icon: '🧮', price: 1000, drops: [{ amount: 750, chance: 45 }, { amount: 1500, chance: 30 }, { amount: 5000, chance: 15 }, { amount: 15000, chance: 8 }, { amount: 50000, chance: 2 }] },
  { id: 'geo', name: 'Геометрический', icon: '📐', price: 3000, drops: [{ amount: 2500, chance: 40 }, { amount: 4000, chance: 30 }, { amount: 12000, chance: 20 }, { amount: 30000, chance: 8 }, { amount: 100000, chance: 2 }] },
  { id: 'chem', name: 'Химический', icon: '🧪', price: 5555, drops: [{ amount: 3333, chance: 40 }, { amount: 7000, chance: 30 }, { amount: 20000, chance: 20 }, { amount: 60000, chance: 8 }, { amount: 200000, chance: 2 }] },
  { id: 'phys', name: 'Физический', icon: '🍎', price: 12345, drops: [{ amount: 6789, chance: 40 }, { amount: 15000, chance: 30 }, { amount: 45000, chance: 20 }, { amount: 150000, chance: 8 }, { amount: 500000, chance: 2 }] },
  { id: 'obzh', name: 'ОБЖ', icon: '🚑', price: 30000, drops: [{ amount: 25000, chance: 40 }, { amount: 40000, chance: 30 }, { amount: 120000, chance: 20 }, { amount: 400000, chance: 8 }, { amount: 3500000, chance: 2 }] }
];

const AVATARS = [
  { id: 's_doc', icon: '📄', price: 10000 },
  { id: 's_leaf', icon: '🍁', price: 25000 },
  { id: 's_book', icon: '📔', price: 50000 },
  { id: 's_books', icon: '📚', price: 75000 },
  { id: 's_pen', icon: '🖊', price: 100000 },
  { id: 's_pencil', icon: '✏️', price: 100000 },
  { id: 's_note', icon: '📝', price: 150000 },
  { id: 's_bag', icon: '🎒', price: 250000 },
  { id: 's_teacher', icon: '👨‍🏫', price: 500000 },
  { id: 's_school', icon: '🏫', price: 750000 },
  { id: 's_triangle', icon: '📐', price: 1000000 },
  { id: 's_ruler', icon: '📏', price: 1250000 },
  { id: 's_cap', icon: '🎓', price: 2500000 }
];

const FRAMES = [
  { id: 'sf_1', style: '0 0 15px #4da6ff', price: 50000, name: 'Синяя (Школа)' },
  { id: 'sf_2', style: '0 0 20px #ff9800', price: 150000, name: 'Оранжевая (Школа)' },
  { id: 'sf_3', style: '0 0 25px #e91e63', price: 500000, name: 'Розовая (Школа)' },
  { id: 'sf_4', style: '0 0 30px #ffd700, 0 0 10px #ffaa00', price: 1500000, name: 'Золотая (Школа)' },
  { id: 'sf_5', style: '0 0 35px #9c27b0, 0 0 15px #4da6ff', price: 5000000, name: 'Выпускник (Школа)' }
];

let activeTab = 'cases';

export function initSchool() {
  if (!state.userData || !currentUser) return;

  if ($('schoolBtn')) $('schoolBtn').onclick = () => { 
    $('schoolModal').classList.add('active'); 
    updateSchoolUI(); 
  };
  if ($('closeSchool')) $('closeSchool').onclick = () => $('schoolModal').classList.remove('active');

  document.querySelectorAll('.school-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.school-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      updateSchoolUI();
    };
  });

  // Выдаем стартовые 100 листов, если их нет
  if (state.userData.schoolPoints === undefined) {
    updateDoc(doc(db, 'users', currentUser.uid), { schoolPoints: START_POINTS }).catch(e => console.log(e));
  }
}

function updateSchoolUI() {
  if (!state.userData) return;

  const points = state.userData.schoolPoints || 0;
  if ($('schoolPointsDisplay')) $('schoolPointsDisplay').textContent = points.toLocaleString('ru-RU') + ' 📄';

  const list = $('schoolList');
  if (!list) return;

  if (activeTab === 'cases') {
    list.innerHTML = CASES.map(c => `
      <div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px; margin-bottom:8px;">
        <div style="font-size:1.5rem;">${c.icon}</div>
        <div style="flex:1;"><div style="font-weight:bold;">${c.name}</div><div style="color:#ffd700; font-size:0.8rem;">${c.price.toLocaleString('ru-RU')} 📄</div></div>
        <button class="btn" style="width:auto; padding:6px 12px;" onclick="buySchoolCase('${c.id}')">Открыть</button>
      </div>
    `).join('');
  } else if (activeTab === 'avatars') {
    list.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(70px, 1fr)); gap:10px;">
      ${AVATARS.map(a => {
        const owned = (state.userData.ownedAvatars || []).includes(a.id);
        return `<div style="text-align:center; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px; cursor:pointer;" onclick="buySchoolAvatar('${a.id}', ${a.price}, '${a.icon}')">
          <div style="font-size:1.5rem;">${a.icon}</div>
          <div style="font-size:0.7rem; color:${owned ? '#22c55e' : '#ffd700'};">${owned ? 'Куплено' : a.price.toLocaleString('ru-RU') + ' 📄'}</div>
        </div>`;
      }).join('')}
    </div>`;
  } else if (activeTab === 'frames') {
    list.innerHTML = FRAMES.map(f => {
      const owned = (state.userData.ownedFrames || []).includes(f.id);
      return `<div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px; margin-bottom:8px;">
        <div style="width:30px; height:30px; border-radius:50%; background:#16203a; border:2px solid #fff; box-shadow:${f.style};"></div>
        <div style="flex:1;"><div style="font-weight:bold; font-size:0.9rem;">${f.name}</div><div style="color:#ffd700; font-size:0.8rem;">${f.price.toLocaleString('ru-RU')} 📄</div></div>
        <button class="btn" style="width:auto; padding:6px 12px; background:${owned ? '#4b5563' : 'linear-gradient(145deg, #3d8bff, #2563eb)'};" onclick="buySchoolFrame('${f.id}', ${f.price}, '${f.style}')">${owned ? 'Куплено' : 'Купить'}</button>
      </div>`;
    }).join('');
  }
}

window.buySchoolCase = async (caseId) => {
  const c = CASES.find(x => x.id === caseId);
  if (!c) return;
  if ((state.userData.schoolPoints || 0) < c.price) return toast('Недостаточно листов 📄');

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { schoolPoints: increment(-c.price) });
    
    const total = c.drops.reduce((s, d) => s + d.chance, 0);
    let r = Math.random() * total;
    let prize = c.drops[c.drops.length - 1];
    for (const d of c.drops) { if (r < d.chance) { prize = d; break; } r -= d.chance; }

    await updateDoc(doc(db, 'users', currentUser.uid), { schoolPoints: increment(prize.amount) });
    
    const fakeCase = { name: c.name, drops: c.drops.map(d => ({ ...d, amount: d.amount })) };
    runRoulette(fakeCase, prize, null, true); // 4-й аргумент isSchool = true
    
    updateSchoolUI();
  } catch (e) {
    console.error(e);
    toast('Ошибка');
  }
};

window.buySchoolAvatar = async (id, price, icon) => {
  if ((state.userData.ownedAvatars || []).includes(id)) {
    await updateDoc(doc(db, 'users', currentUser.uid), { avatar: icon });
    toast('Аватарка надета!');
    updateSchoolUI();
    return;
  }
  if ((state.userData.schoolPoints || 0) < price) return toast('Мало листов 📄');
  
  await updateDoc(doc(db, 'users', currentUser.uid), { 
    schoolPoints: increment(-price), ownedAvatars: arrayUnion(id), avatar: icon 
  });
  toast('Аватарка куплена и надета!');
  updateSchoolUI();
};

window.buySchoolFrame = async (id, price, style) => {
  if ((state.userData.ownedFrames || []).includes(id)) return toast('Уже куплено');
  if ((state.userData.schoolPoints || 0) < price) return toast('Мало листов 📄');

  await updateDoc(doc(db, 'users', currentUser.uid), { 
    schoolPoints: increment(-price), ownedFrames: arrayUnion(id), frame: id 
  });
  toast('Рамка куплена и надета!');
  updateSchoolUI();
};