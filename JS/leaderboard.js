import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { currentUser } from './game.js';

const $ = id => document.getElementById(id);
let unsubBalance = null;
let unsubOpened = null;
let activeTab = 'balance';

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

  if (activeTab === 'balance') {
    const q = query(collection(db, 'users'), orderBy('balance', 'desc'), limit(50));
    unsubBalance = onSnapshot(q, (snap) => {
      renderList(snap.docs.map((d, i) => ({
        place: i + 1, username: d.data().username || 'Unknown',
        value: (d.data().balance || 0).toLocaleString('ru-RU') + ' ₽', uid: d.id
      })));
    }, (err) => {
      console.error("Ошибка лидерборда:", err);
      list.innerHTML = '<div class="inv-empty">Ошибка загрузки (проверь индексы в Firebase)</div>';
    });
  } else {
    const q = query(collection(db, 'users'), orderBy('totalOpened', 'desc'), limit(50));
    unsubOpened = onSnapshot(q, (snap) => {
      renderList(snap.docs.map((d, i) => ({
        place: i + 1, username: d.data().username || 'Unknown',
        value: (d.data().totalOpened || 0) + ' кейсов', uid: d.id
      })));
    }, (err) => {
      console.error("Ошибка лидерборда:", err);
      list.innerHTML = '<div class="inv-empty">Ошибка загрузки (проверь индексы в Firebase)</div>';
    });
  }
}

function renderList(items) {
  const list = $('lbList');
  if (!items.length) { list.innerHTML = '<div class="inv-empty">Пока никого нет</div>'; return; }
  const medals = ['🥇', '🥈', '🥉'];
  list.innerHTML = items.map(it => {
    const isMe = it.uid === currentUser?.uid;
    const placeIcon = it.place <= 3 ? medals[it.place - 1] : `#${it.place}`;
    return `
      <div class="lb-item ${isMe ? 'me' : ''}">
        <div class="lb-place">${placeIcon}</div>
        <div class="lb-avatar">${(it.username||'?')[0].toUpperCase()}</div>
        <div class="lb-name">${it.username}${isMe ? ' (ты)' : ''}</div>
        <div class="lb-value">${it.value}</div>
      </div>
    `;
  }).join('');
}