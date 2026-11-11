import { db } from './firebase-config.js';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

export function initGlobalChat(user) {
  const chatList = document.getElementById('globalChatMessages');
  if (!chatList) return;

  const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'desc'), limit(50));
  
  onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    chatList.innerHTML = msgs.map(m => {
      if (m.isSystem) {
        return `<div style="text-align:center; font-size:0.8rem; color:#ffd700; margin:5px 0; font-style:italic;">${m.text}</div>`;
      }
      const isMine = m.uid === user.uid;
      const avatar = m.avatar || '👤';
      
      return `<div style="margin-bottom:8px; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px; border-left:3px solid ${isMine ? '#22c55e' : '#4da6ff'}; display:flex; gap:10px;">
        <div style="font-size:1.5rem; width:30px; text-align:center;">${avatar}</div>
        <div>
          <div style="font-size:0.75rem; color:#8ba3c7; font-weight:bold;">${m.username}</div>
          <div style="font-size:0.9rem; color:#fff;">${m.text}</div>
        </div>
      </div>`;
    }).join('');
    chatList.scrollTop = chatList.scrollHeight;
  });

  const input = document.getElementById('globalChatInput');
  const sendBtn = document.getElementById('globalChatSendBtn');

  if (sendBtn) {
    sendBtn.onclick = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      
      const uDoc = await getDoc(doc(db, 'users', user.uid));
      const avatar = uDoc.data().avatar || '👤';

      await addDoc(collection(db, 'global_chat'), {
        uid: user.uid, username: user.username, avatar: avatar, text, isSystem: false, createdAt: serverTimestamp()
      });
    };
  }
}

export async function sendGlobalMessage(text) {
  try {
    await addDoc(collection(db, 'global_chat'), {
      uid: 'system', username: 'Система', text, isSystem: true, createdAt: serverTimestamp()
    });
  } catch(e) { console.error(e); }
}