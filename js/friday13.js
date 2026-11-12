import { db } from './firebase-config.js';
import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast } from './game.js';

const $ = id => document.getElementById(id);

// Кейсы Пятницы 13-го
const CASES = [
  { id: 'f13_1', name: 'Кейс 1 (1.000₽)', icon: '🔪', price: 1000 },
  { id: 'f13_2', name: 'Кейс 2 (25.000₽)', icon: '🩸', price: 25000 },
  { id: 'f13_3', name: 'Кейс 3 (100.000₽)', icon: '🕷️', price: 100000 },
  { id: 'f13_4', name: 'Кейс 4 (2.5 млн ₽)', icon: '⚰️', price: 2500000 },
  { id: 'f13_5', name: 'Кейс 5 (25 млн ₽)', icon: '👹', price: 25000000 }
];

export function initFriday13() {
  if ($('fridayBtn')) $('fridayBtn').onclick = () => { 
    $('fridayModal').classList.add('active'); 
    renderFridayUI(); 
  };
  if ($('closeFriday')) $('closeFriday').onclick = () => $('fridayModal').classList.remove('active');
}

function renderFridayUI() {
  const list = $('fridayList');
  if (!list) return;

  list.innerHTML = CASES.map(c => `
    <div style="display:flex; align-items:center; gap:10px; padding:12px; background:rgba(255,0,0,0.1); border:1px solid rgba(255,0,0,0.3); border-radius:12px; margin-bottom:8px;">
      <div style="font-size:2rem;">${c.icon}</div>
      <div style="flex:1;">
        <div style="font-weight:bold; color:#ff6b6b;">${c.name}</div>
        <div style="font-size:0.75rem; color:#8ba3c7;">Штраф: 25% | Профит: x15</div>
      </div>
      <button class="btn" style="width:auto; padding:8px 14px; background:linear-gradient(145deg, #dc2626, #7f1d1d);" onclick="openFridayCase('${c.id}', ${c.price})">Открыть</button>
    </div>
  `).join('');
}

window.openFridayCase = async (caseId, price) => {
  if (state.balance < price) return toast('Недостаточно средств!');
  
  const c = CASES.find(x => x.id === caseId);
  
  try {
    // Списываем стоимость кейса
    await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-price) });

    // Крутим рулетку: 45% — профит x15, 55% — штраф 25%
    const isProfit = Math.random() < 0.45;
    
    // Визуальная анимация рулетки (используем runRoulette из game.js, но кастомно)
    // Для простоты покажем через встроенный toast и анимацию в модалке
    const resultBox = document.getElementById('fridayResult');
    if (resultBox) {
      resultBox.textContent = 'Крутим...';
      resultBox.style.color = '#fff';
    }

    setTimeout(async () => {
      if (isProfit) {
        const winAmount = price * 15;
        await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(winAmount) });
        if (resultBox) {
          resultBox.textContent = `🎉 УСПЕХ! ВЫ ВЫИГРАЛИ ${winAmount.toLocaleString('ru-RU')} ₽!`;
          resultBox.style.color = '#22c55e';
        }
        toast(`Победа! +${winAmount.toLocaleString('ru-RU')} ₽`);
      } else {
        // Штраф 25% от текущего баланса (не от кейса!)
        const penalty = Math.floor(state.balance * 0.25);
        await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-penalty) });
        if (resultBox) {
          resultBox.textContent = `💀 ПРОКЛЯТИЕ! ШТРАФ: -${penalty.toLocaleString('ru-RU')} ₽`;
          resultBox.style.color = '#ff6b6b';
        }
        toast(`Штраф: -${penalty.toLocaleString('ru-RU')} ₽`);
      }
    }, 1000); // Задержка для азарта

  } catch (e) {
    console.error(e);
    toast('Ошибка');
  }
};