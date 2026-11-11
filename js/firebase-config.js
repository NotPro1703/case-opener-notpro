// Firebase SDK v13.2.0 (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHMG7KCvE8Z1uHONh0vVohSZeqNhdbeII",
  authDomain: "case-opener-notpro.firebaseapp.com",
  projectId: "case-opener-notpro",
  storageBucket: "case-opener-notpro.firebasestorage.app",
  messagingSenderId: "586834685400",
  appId: "1:586834685400:web:e1e1b21ca73c8669a396ad",
  measurementId: "G-QZXEFFPEW9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);