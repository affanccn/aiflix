// Firebase Configuration & Global Initialization
const firebaseConfig = {
  apiKey: "AIzaSyDxzwT5RvvKrJq8qcR1AQGoMCvZU7keQsk",
  authDomain: "aiflix-f7b94.firebaseapp.com",
  projectId: "aiflix-f7b94",
  storageBucket: "aiflix-f7b94.firebasestorage.app",
  messagingSenderId: "149472297975",
  appId: "1:149472297975:web:2103ee6dc06a34e64ea4f2",
  measurementId: "G-QC5JTQH1KD"
};

// Initialize Firebase if compat SDK is loaded
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.auth = firebase.auth();
  window.db = firebase.firestore();
}
