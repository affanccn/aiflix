// Firebase Configuration & Global Initialization (ES Module & Global Window)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDxzwT5RvvKrJq8qcR1AQGoMCvZU7keQsk",
  authDomain: "aiflix-f7b94.firebaseapp.com",
  projectId: "aiflix-f7b94",
  storageBucket: "aiflix-f7b94.firebasestorage.app",
  messagingSenderId: "149472297975",
  appId: "1:149472297975:web:2103ee6dc06a34e64ea4f2",
  measurementId: "G-QC5JTQH1KD"
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Global window erişimi
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.firebaseApp = app;
  window.auth = auth;
  window.db = db;
}

export default app;
