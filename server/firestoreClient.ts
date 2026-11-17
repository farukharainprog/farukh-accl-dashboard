import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, limit, type Firestore } from 'firebase/firestore';
import { normalizeGmail } from './db.js';

let cachedFsDb: Firestore | null = null;

function getServerFirestore(): Firestore | null {
  if (cachedFsDb) return cachedFsDb;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = getApps().length > 0 ? getApp() : initializeApp(cfg);
    cachedFsDb = getFirestore(app, cfg.firestoreDatabaseId || '(default)');
    return cachedFsDb;
  } catch (err) {
    console.warn('[ServerFirestore] Init error:', err);
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 3500, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

export async function fetchFirestoreUserByEmail(email: string): Promise<any | null> {
  const fsDb = getServerFirestore();
  if (!fsDb || !email) return null;
  const cleanEmail = String(email).toLowerCase().trim();
  const normalizedTarget = normalizeGmail(cleanEmail);

  return withTimeout(
    (async () => {
      try {
        const directSnap = await getDocs(query(collection(fsDb, 'users'), where('email', '==', cleanEmail), limit(1)));
        if (!directSnap.empty) {
          return directSnap.docs[0].data();
        }
        const allSnap = await getDocs(collection(fsDb, 'users'));
        for (const d of allSnap.docs) {
          const u = d.data();
          const uEmail = String(u.email || '').toLowerCase().trim();
          if (uEmail === cleanEmail || normalizeGmail(uEmail) === normalizedTarget) {
            return u;
          }
          if (
            (cleanEmail === 'mateenbusinesswala@gmail.com' && uEmail === 'mateenbusnesswala@gmail.com') ||
            (cleanEmail === 'mateenbusnesswala@gmail.com' && uEmail === 'mateenbusinesswala@gmail.com')
          ) {
            return u;
          }
        }
        return null;
      } catch (err) {
        console.warn('[ServerFirestore] fetchFirestoreUserByEmail error:', err);
        return null;
      }
    })(),
    3500,
    null
  );
}

export async function fetchFirestoreUserById(idOrEmail: string): Promise<any | null> {
  const fsDb = getServerFirestore();
  if (!fsDb || !idOrEmail) return null;
  const target = String(idOrEmail).trim();

  if (target.includes('@')) {
    return fetchFirestoreUserByEmail(target);
  }

  return withTimeout(
    (async () => {
      try {
        const snap = await getDoc(doc(fsDb, 'users', target));
        if (snap.exists()) return snap.data();

        const allSnap = await getDocs(collection(fsDb, 'users'));
        for (const d of allSnap.docs) {
          const u = d.data();
          if (String(u.id || '') === target || String(u.legacy_id || '') === target) {
            return u;
          }
        }
        return null;
      } catch (err) {
        console.warn('[ServerFirestore] fetchFirestoreUserById error:', err);
        return null;
      }
    })(),
    3500,
    null
  );
}

export async function fetchFirestoreUsersByRole(role?: string): Promise<any[]> {
  const fsDb = getServerFirestore();
  if (!fsDb) return [];
  return withTimeout(
    (async () => {
      try {
        const col = collection(fsDb, 'users');
        const q = role ? query(col, where('role', '==', role)) : query(col);
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data());
      } catch (err) {
        console.warn('[ServerFirestore] fetchFirestoreUsersByRole error:', err);
        return [];
      }
    })(),
    3500,
    []
  );
}
