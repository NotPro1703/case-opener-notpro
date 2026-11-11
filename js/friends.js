import { db } from './firebase-config.js';
import {
  doc, getDoc, addDoc, collection, query, where, onSnapshot,
  updateDoc, deleteDoc, serverTimestamp, increment, arrayUnion, arrayRemove, getDocs
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast } from './game.js';

const $ = id => document.getElementById(id);
let activeGiftTarget = null;
let friendsInterval = null;

export function initFriends(user, st) {
  // 1. Слушаем заявки
  const reqQ = query(collection(db, 'friendRequests'), where('to', '==', user.uid), where('status', '==', 'pending'));
  onSnapshot(reqQ, (snap) => {
    state.requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRequests();
  });

  // 2. Слушаем изменения профиля (когда добавляем/удаляем друга)
  onSnapshot(doc(db, 'users', user.uid), async (snap) => {
    if (!snap.exists()) return;
    await fetchFriendsProfiles(snap.data().friends || []);
  });

  // 3. Принудительное обновление раз в 5 секунд (чтобы видеть актуальный баланс друзей)
  if (friendsInterval) clearInterval(friendsInterval);
  friendsInterval = setInterval(async () => {
    if (!currentUser) return;
    try {
      const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (myDoc.exists()) await fetchFriendsProfiles(myDoc.data().friends || []);
    } catch (e) {}
  }, 5000);

  // Кнопки
  const addBtn = $('addFriendBtn'); if (addBtn) addBtn.onclick = () => addFriend();
  const sendMoneyBtn = $('sendMoneyBtn'); if (sendMoneyBtn) sendMoneyBtn.onclick = () => sendMoneyGift();
}

async function fetchFriendsProfiles(friendUids) {
  if (!friendUids || !friendUids.length) { 
    state.friends = []; 
    renderFriends(); 
    return; 
  }
  
  const profiles = [];
  for (const uid of friendUids) {
    const p = await getDoc(doc(db, 'users', uid));
    if (p.exists()) profiles.push({ uid, ...p.data() });
  }
  
  // Обновляем интерфейс ТОЛЬКО если реально изменились данные (баланс или имя)
  const isChanged = JSON.stringify(state.friends.map(f => ({u: f.uid, b: f.balance, n: f.username}))) !== 
                    JSON.stringify(profiles.map(f => ({u: f.uid, b: f.balance, n: f.username})));
  
  state.friends = profiles;
  if (isChanged) renderFriends();
}

function renderFriends() {
  const list = $('friendsList');
  if (!list) return;
  
  if (!state.friends.length) { 
    list.innerHTML = `<div class="inv-empty">Пока нет друзей</div>`; 
    return; 
  }
  
  list.innerHTML = state.friends.map(f => `
    <div class="friend-item">
      <div class="friend-avatar">${(f.username || '?')[0].toUpperCase()}</div>
      <div class="friend-name">
        ${f.username} 
        <span style="font-size:0.75rem;color:#8ba3c7;font-weight:normal;display:block;">${(f.balance || 0).toLocaleString('ru-RU')} ₽</span>
      </div>
      <div class="friend-actions">
        <button data-chat="${f.uid}" data-name="${f.username}">Чат</button>
        <button class="gift" data-gift="${f.uid}" data-name="${f.username}">💰 Перевод</button>
        <button data-remove="${f.uid}" style="background:linear-gradient(145deg,#ff6b6b,#dc2626);" title="Удалить">✕</button>
      </div>
    </div>
  `).join('');

  // Навешиваем события
  list.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => window.openChat(b.dataset.chat, b.dataset.name));
  list.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => openGiftMenu(b.dataset.gift, b.dataset.name));
  list.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => removeFriend(b.dataset.remove));
}

function renderRequests() {
  const list = $('requestsList');
  if (!list) return;
  if (!state.requests.length) { list.innerHTML = ''; return; }
  
  list.innerHTML = '<div class="section-title" style="margin-top:15px;font-size:0.75rem;">Входящие заявки</div>' +
    state.requests.map(r => `
      <div class="friend-item" style="border-color:#4da6ff;background:rgba(77,166,255,0.05);">
        <div class="friend-avatar" style="background:#4da6ff;">?</div>
        <div class="friend-name">Заявка от <b>${r.fromName}</b></div>
        <div class="friend-actions">
          <button data-accept="${r.id}" data-from="${r.from}" data-fromname="${r.fromName}">Принять</button>
          <button data-decline="${r.id}" style="background:linear-gradient(145deg,#ff6b6b,#dc2626);">✕</button>
        </div>
      </div>
    `).join('');

  list.querySelectorAll('[data-accept]').forEach(b => b.onclick = () => acceptRequest(b.dataset.accept, b.dataset.from, b.dataset.fromname));
  list.querySelectorAll('[data-decline]').forEach(b => b.onclick = () => deleteDoc(doc(db, 'friendRequests', b.dataset.decline)));
}

async function addFriend() {
  const input = $('friendName');
  const nameLower = input.value.trim().toLowerCase();
  if (!nameLower) return;
  if (nameLower === currentUser.username.toLowerCase()) { toast('Нельзя добавить самого себя'); return; }

  try {
    const nameDoc = await getDoc(doc(db, 'usernames', nameLower));
    if (!nameDoc.exists()) { toast('Пользователь не найден'); return; }
    const toUid = nameDoc.data().uid;

    const myProfile = await getDoc(doc(db, 'users', currentUser.uid));
    if ((myProfile.data().friends || []).includes(toUid)) { toast('Этот игрок уже у вас в друзьях'); return; }

    const q = query(collection(db, 'friendRequests'), where('from', '==', currentUser.uid), where('to', '==', toUid), where('status', '==', 'pending'));
    const existing = await getDocs(q);
    if (!existing.empty) { toast('Заявка уже отправлена'); return; }

    await addDoc(collection(db, 'friendRequests'), {
      from: currentUser.uid, fromName: currentUser.username, to: toUid, status: 'pending', createdAt: serverTimestamp()
    });
    toast(`Заявка отправлена игроку ${input.value.trim()}`);
    input.value = '';
  } catch (e) { 
    console.error(e);
    toast('Ошибка отправки заявки'); 
  }
}

async function acceptRequest(reqId, fromUid, fromName) {
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(currentUser.uid) });
    await updateDoc(doc(db, 'friendRequests', reqId), { status: 'accepted' });
    toast(`Теперь вы друзья с ${fromName}`);
  } catch (e) { toast('Ошибка принятия заявки'); }
}

async function removeFriend(friendUid) {
  if (!confirm('Удалить этого игрока из друзей?')) return;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayRemove(friendUid) });
    await updateDoc(doc(db, 'users', friendUid), { friends: arrayRemove(currentUser.uid) });
    toast('Игрок удален из друзей');
  } catch (e) { toast('Ошибка удаления'); }
}

function openGiftMenu(toUid, toName) {
  activeGiftTarget = { uid: toUid, name: toName };
  if ($('giftToName')) $('giftToName').textContent = toName;
  if ($('giftMoney')) $('giftMoney').value = '';
  $('giftModal').classList.add('active');
}

async function sendMoneyGift() {
  if (!activeGiftTarget) return;
  const amountInput = $('giftMoney');
  const amount = parseInt(amountInput.value);
  
  if (!amount || amount <= 0) { toast('Введите корректную сумму'); return; }
  if (state.balance < amount) { toast('Недостаточно средств'); return; }
  if (amount > 1000000) { toast('Слишком большая сумма'); return; }

  try {
    // Блокируем кнопку, чтобы не нажать дважды
    const btn = $('sendMoneyBtn');
    btn.disabled = true;
    btn.textContent = '...';

    // Списываем у себя
    await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-amount) });
    
    // Начисляем другу
    await updateDoc(doc(db, 'users', activeGiftTarget.uid), { balance: increment(amount) });
    
    toast(`Вы перевели ${amount.toLocaleString('ru-RU')} ₽ игроку ${activeGiftTarget.name}`);
    $('giftModal').classList.remove('active');
    
    btn.disabled = false;
    btn.textContent = 'Отправить';
  } catch (e) {
    console.error(e);
    toast('Ошибка перевода');
    const btn = $('sendMoneyBtn');
    btn.disabled = false;
    btn.textContent = 'Отправить';
  }
}