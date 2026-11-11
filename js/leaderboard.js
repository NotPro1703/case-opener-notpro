import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { currentUser } from './game.js';

const $ = id => document.getElementById(id);
let unsubBalance = null, unsubOpened = null, activeTab = 'balance';

export function initLeaderboard() {
  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.lb;
      loadLeaderboard();
    };
  });
}

export function openLeaderboard() {
  $('lbModal').classList.add('active');
  loadLeaderboard();
}

function loadLeaderboard() {
  const list = $('lbList');
  if (!list) return;
  list.innerHTML = '<div class="inv-empty">Загрузка...</div>';

  if (unsubBalance) { unsubBalance(); unsubBalance = null; }
  if (unsubOpened) { unsubOpened(); unsubOpened = null; }

  const field = activeTab === 'balance' ? 'balance' : 'totalOpened';
  const q = query(collection(db, 'users'), orderBy(field, 'desc'), limit(50));
  
  unsubBalance = onSnapshot(q, (snap) => {
    renderList(snap.docs.map((d, i) => ({
      place: i + 1, username: d.data().username || 'Unknown',
      value: activeTab === 'balance' ? (d.data().balance || 0).toLocaleString('ru-RU') + ' ₽' : (d.data().totalOpened || 0) + ' кейсов',
      uid: d.id,
      prestige: d.data().prestige || 0,
      avatar: d.data().avatar || '👤',
      frame: d.data().frame || 'none'
    })));
  });
}

function renderList(items) {
  const list = $('lbList');
  if (!items.length) { list.innerHTML = '<div class="inv-empty">Пока никого нет</div>'; return; }
  
  const medals = ['🥇', '🥈', '🥉'];
  const frameStyles = {
    'none': 'none',
    'blue': '0 0 10px #4da6ff',
    'gold': '0 0 15px #ffd700',
    'neon': '0 0 20px #b26bff',
    'fire': '0 0 25px #ff4500'
  };

  list.innerHTML = items.map(it => {
    const isMe = it.uid === currentUser?.uid;
    const placeIcon = it.place <= 3 ? medals[it.place - 1] : `#${it.place}`;
    const star = it.prestige > 0 ? ` <span style="color:#ffd700; font-size:0.8rem;">⭐${it.prestige}</span>` : '';
    
    return `
      <div class="lb-item ${isMe ? 'me' : ''}">
        <div class="lb-place">${placeIcon}</div>
        <div class="lb-avatar" style="box-shadow: ${frameStyles[it.frame] || 'none'}; font-size:1.2rem;">${it.avatar}</div>
        <div class="lb-name">${it.username}${star}${isMe ? ' (ты)' : ''}</div>
        <div class="lb-value">${it.value}</div>
      </div>
    `;
  }).join('');
}