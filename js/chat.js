import { db } from './firebase-config.js';
import {
  doc, collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { currentUser } from './game.js';

const $ = id => document.getElementById(id);
let currentChatUid = null;
let currentChatName = '';
let unsubscribe = null;

export function initChat(user) {
  $('sendMsgBtn').onclick = () => sendMessage();
  $('chatInput').onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };
}

// id чата = сортированные uid через _
function chatId(a, b) {
  return [a, b].sort().join('_');
}

window.openChat = (friendUid, friendName) => {
  currentChatUid = friendUid;
  currentChatName = friendName;
  $('chatTitle').textContent = `💬 ${friendName}`;
  $('chatModal').classList.add('active');
  $('chatMessages').innerHTML = '';

  if (unsubscribe) unsubscribe();

  const cid = chatId(currentUser.uid, friendUid);
  const q = query(collection(db, 'chats', cid, 'messages'), orderBy('createdAt', 'asc'));
  unsubscribe = onSnapshot(q, (snap) => {
    $('chatMessages').innerHTML = snap.docs.map(d => {
      const m = d.data();
      const mine = m.from === currentUser.uid;
      return `<div class="chat-msg ${mine ? 'mine' : ''}">
        <div class="who">${mine ? 'Ты' : m.fromName}</div>
        <div class="txt">${escapeHtml(m.text)}</div>
      </div>`;
    }).join('');
    $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
  });
};

async function sendMessage() {
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text || !currentChatUid) return;
  input.value = '';

  const cid = chatId(currentUser.uid, currentChatUid);
  await addDoc(collection(db, 'chats', cid, 'messages'), {
    from: currentUser.uid,
    fromName: currentUser.username,
    text,
    createdAt: serverTimestamp()
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('closeChat').onclick = () => {
  $('chatModal').classList.remove('active');
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
};