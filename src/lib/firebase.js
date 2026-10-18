import { initializeApp, getApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSUb1QhQjoXYIFSwOIeFosTwMazJygjJ8",
  authDomain: "galaxycrm-4577f.firebaseapp.com",
  projectId: "galaxycrm-4577f",
  storageBucket: "galaxycrm-4577f.firebasestorage.app",
  messagingSenderId: "164533149482",
  appId: "1:164533149482:web:3c3d7952deb365d2708853",
  measurementId: "G-5CRL2LTT5L"
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
