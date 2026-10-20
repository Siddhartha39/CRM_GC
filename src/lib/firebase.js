import { initializeApp, getApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBSUb1QhQjoXYIFSwOIeFosTwMazJygjJ8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "galaxycrm-4577f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "galaxycrm-4577f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "galaxycrm-4577f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "164533149482",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:164533149482:web:3c3d7952deb365d2708853",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5CRL2LTT5L"
};

export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function initializeAnalytics() {
  if (typeof window === "undefined") return null;

  try {
    if (await isSupported()) {
      return getAnalytics(app);
    }
  } catch (error) {
    console.warn("Firebase Analytics unavailable:", error);
  }

  return null;
}
