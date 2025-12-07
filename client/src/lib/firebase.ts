import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, deleteUser, type User } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, updateDoc, serverTimestamp, deleteDoc, writeBatch, limit, or, arrayUnion, arrayRemove } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const storage = getStorage(app);
export { onAuthStateChanged, signInWithEmailAndPassword, signOut, deleteUser };
export type { User };
export {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  limit,
  or,
  arrayUnion,
  arrayRemove,
  db as firestoreDb,
};
export {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};


