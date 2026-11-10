import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'node:fs';

const firebaseConfig = {
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
const firestoreDb = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');

async function backup() {
  console.log('Connecting to Cloud Firestore and backing up data...');
  const usersSnap = await getDocs(collection(firestoreDb, 'users'));
  const subsSnap = await getDocs(collection(firestoreDb, 'submissions'));
  const attSnap = await getDocs(collection(firestoreDb, 'attendance_sessions'));

  const users = usersSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  const submissions = subsSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  const attendance = attSnap.docs.map(d => ({ _id: d.id, ...d.data() }));

  const backupData = {
    timestamp: new Date().toISOString(),
    usersCount: users.length,
    submissionsCount: submissions.length,
    attendanceCount: attendance.length,
    users,
    submissions,
    attendance
  };

  fs.writeFileSync('./backup_firestore_data.json', JSON.stringify(backupData, null, 2), 'utf-8');
  console.log('====================================');
  console.log('BACKUP CREATED SUCCESSFULLY: backup_firestore_data.json');
  console.log(`Users: ${users.length}, Submissions: ${submissions.length}, Attendance: ${attendance.length}`);
  console.log('====================================');
  console.log('USERS IN FIRESTORE:');
  users.forEach(u => console.log(`- [${u._id}] ${u.email} | ${u.full_name} | role: ${u.role} | status: ${u.status}`));
  
  console.log('\nSUBMISSIONS IN FIRESTORE:');
  submissions.forEach(s => console.log(`- [${s._id}] ${s.student_email} | Task #${s.task_day} (${s.task_title}) | Status: ${s.status}`));
}

backup().then(() => process.exit(0)).catch(e => { console.error('Backup error:', e); process.exit(1); });
