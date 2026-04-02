// firebase-config.js
// IMPORTANT: Replace these placeholder values with your actual Firebase config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

// Your Firebase configuration object (get from Firebase Console > Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyASIPoPxWTP46q8c2rEE418uzSBQgg8cMo",
  authDomain: "abotani-rental.firebaseapp.com",
  projectId: "abotani-rental",
  storageBucket: "abotani-rental.firebasestorage.app",
  messagingSenderId: "823152338461",
  appId: "1:823152338461:web:963a771468499ae7a588f4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const functions = getFunctions(app);

// Export for use in other files
export { db, functions, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, orderBy, Timestamp };
