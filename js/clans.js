import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, increment } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { state, currentUser, toast } from './game.js';

const $ = id => document.getElementById(id);

export function initClans(user, st) {
  onSnapshot(doc(db, 'users', user.uid), async (snap) => {
    if (!snap.exists()) return;
    const clanId = snap.data().clanId;
    const box = $('clanContent');
    if (!box) return;
    
    if (!clanId) {
      box.innerHTML = `
        <div style="text-align:center; padding:15px;">
          <p style="color:#8ba3c7; margin-bottom:10px;">Вы не в клане</p>
          <div style="display:flex; gap:10px; justify-content:center; margin-bottom:10px;">
            <input type="text" id="newClanName" placeholder="Название клана" style="padding:10px; border-radius:10px; background:#0e1524; border:1px solid #24344f; color:#fff;">
            <button class="btn" id="createClanBtn" style="width:auto; background:#ffd700; color:#000;">Создать (100k ₽)</button>
          </div>
          <div style="display:flex; gap:10px; justify-content:center;">
             <input type="text" id="joinClanId" placeholder="ID клана" style="padding:10px; border-radius:10px; background:#0e1524; border:1px solid #24344f; color:#fff;">
             <button class="btn" id="joinClanBtn" style="width:auto;">Вступить</button>
          </div>
        </div>
      `;
      $('createClanBtn').onclick = async () => {
        const name = $('newClanName').value.trim();
        if (!name) return toast('Введите название');
        if (state.balance < 100000) return toast('Недостаточно средств!');
        
        const newClanId = 'clan_' + Date.now();
        await setDoc(doc(db, 'clans', newClanId), {
          name, leaderId: user.uid, leaderName: user.username,
          treasury: 0, members: [user.uid], createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'users', user.uid), { clanId: newClanId, balance: increment(-100000) });
        toast('Клан создан!');
      };
      $('joinClanBtn').onclick = async () => {
        const id = $('joinClanId').value.trim();
        const cDoc = await getDoc(doc(db, 'clans', id));
        if (!cDoc.exists()) return toast('Клан не найден');
        await updateDoc(doc(db, 'clans', id), { members: arrayUnion(user.uid) });
        await updateDoc(doc(db, 'users', user.uid), { clanId: id });
        toast('Вы вступили в клан!');
      };
    } else {
      const cDoc = await getDoc(doc(db, 'clans', clanId));
      if (!cDoc.exists()) return;
      const c = cDoc.data();
      const isLeader = c.leaderId === user.uid;

      box.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <h3 style="color:#ffd700; font-size:1.5rem;">${c.name}</h3>
          <p style="color:#8ba3c7;">Лидер: ${c.leaderName}</p>
          <div style="font-size:1.2rem; margin:10px 0;">🏦 Казна: <b style="color:#22c55e;">${c.treasury.toLocaleString('ru-RU')} ₽</b></div>
          <div style="font-size:0.9rem; margin-bottom:15px;">Участников: ${c.members.length}</div>
          
          <div style="display:flex; gap:10px; justify-content:center;">
            <button class="btn" id="leaveClanBtn" style="width:auto; background:#ff6b6b;">Покинуть</button>
            ${isLeader ? `<button class="btn" id="clanGiftBtn" style="width:auto; background:#22c55e;">Выдать всем по 10k</button>` : ''}
          </div>
        </div>
      `;
      
      $('leaveClanBtn').onclick = async () => {
        await updateDoc(doc(db, 'clans', clanId), { members: arrayRemove(user.uid) });
        await updateDoc(doc(db, 'users', user.uid), { clanId: null });
      };

      if (isLeader && $('clanGiftBtn')) {
        $('clanGiftBtn').onclick = async () => {
          if (c.treasury < 10000) return toast('В казне мало денег!');
          await updateDoc(doc(db, 'clans', clanId), { treasury: increment(-10000) });
          for (const m of c.members) {
            await updateDoc(doc(db, 'users', m), { balance: increment(10000) });
          }
          toast('Награда выдана всем участникам!');
        };
      }
    }
  });
}