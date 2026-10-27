import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "gen-lang-client-0051136797",
  appId: "1:987453111915:web:e508877b019bf887313b2e",
  apiKey: "AIzaSyAdyKDZB5ztsEZvf6ahRRxAB_EN1hmR42Y",
  authDomain: "gen-lang-client-0051136797.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-farukhbusinessma-5fbd52bf-8af3-4ff1-a24e-29e37a088464",
  storageBucket: "gen-lang-client-0051136797.firebasestorage.app",
  messagingSenderId: "987453111915",
  measurementId: "",
  oAuthClientId: "987453111915-37u5587njnemr2giv5sqc49801hfkba4.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');

// Test connection on boot
(async () => {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    console.log('[Firestore] Connected to Cloud Firestore:', firebaseConfig.firestoreDatabaseId);
  } catch (err: any) {
    if (err?.message?.includes('offline')) {
      console.warn('[Firestore] Client is offline');
    }
  }
})();

export { app };
