import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const tabs = document.querySelectorAll('.tab');
const form = $('authForm');
const usernameEl = $('username');
const passwordEl = $('password');
const submitBtn = $('submitBtn');
const errorEl = $('error');

let mode = 'login';

// Переключение вкладок "Вход" / "Регистрация"
tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    mode = tab.dataset.tab;
    submitBtn.textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
    errorEl.textContent = '';
  };
});

// Генерируем fake-email из имени (т.к. входим только по имени и паролю)
const toEmail = (username) => `${username.toLowerCase()}@caseopener.local`;

// Валидация имени: минимум 1 английская буква, разрешены буквы/цифры/_/-
const validUsername = (u) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(u);

form.onsubmit = async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  errorEl.style.color = '#ff6b6b';
  
  const username = usernameEl.value.trim();
  const password = passwordEl.value;

  if (!validUsername(username)) {
    errorEl.textContent = 'Имя: начни с английской буквы, только латиница/цифры/_/-';
    return;
  }
  if (password.length < 5) {
    errorEl.textContent = 'Пароль должен быть не короче 5 символов';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Загрузка...';

  try {
    if (mode === 'register') {
      // 1. Проверяем уникальность имени
      const nameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
      if (nameDoc.exists()) {
        errorEl.textContent = 'Это имя уже занято';
        return;
      }

      // 2. Создаем пользователя в Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, toEmail(username), password);
      console.log("Auth создан:", cred.user.uid);

      // 3. Сохраняем профиль в Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        username,
        usernameLower: username.toLowerCase(),
        balance: 0,
        totalOpened: 0,
        friends: [],
        createdAt: serverTimestamp()
      });
      console.log("Профиль в users создан");

      // 4. Записываем имя (для проверки уникальности)
      await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        uid: cred.user.uid
      });
      console.log("Имя в usernames зарезервировано");

      // 5. Переходим в игру
      location.href = 'game.html';

    } else {
      // Вход
      await signInWithEmailAndPassword(auth, toEmail(username), password);
      location.href = 'game.html';
    }
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      errorEl.textContent = 'Неверное имя или пароль';
    } else if (err.code === 'auth/email-already-in-use') {
      errorEl.textContent = 'Это имя уже занято';
    } else if (err.code === 'permission-denied' || err.message.includes('permissions')) {
      errorEl.textContent = 'Ошибка базы данных. Проверь правила Firestore (Rules).';
    } else {
      errorEl.textContent = 'Ошибка: ' + err.message;
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
  }
};

// Проверка при загрузке страницы: если уже вошел, кидаем в игру.
// НО! Сначала проверяем, есть ли профиль в базе, чтобы не было бесконечного цикла.
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        location.href = 'game.html';
      } else {
        // Если Auth есть, а профиля нет — разлогиниваем, чтобы человек создал его заново
        console.warn("Пользователь в Auth есть, но профиля в базе нет. Разлогиниваем.");
        await auth.signOut();
      }
    } catch (e) {
      console.error("Не удалось проверить профиль:", e);
      // Если правила запрещают чтение, тоже разлогиниваем, чтобы не было цикла
      await auth.signOut();
    }
  }
});