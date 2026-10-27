import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { firestoreDb } from '../firebase';
import type { UserProfile, TaskItem, AttendanceStatus } from '../types';

export const firestoreService = {
  // ==========================================
  // USERS & AUTH
  // ==========================================
  async saveUser(user: any): Promise<void> {
    try {
      const cleanEmail = String(user.email).toLowerCase().trim();
      const userRef = doc(firestoreDb, 'users', user.id || cleanEmail);
      await setDoc(
        userRef,
        {
          id: user.id || cleanEmail,
          email: cleanEmail,
          full_name: user.full_name || 'Student',
          whatsapp: user.whatsapp || '',
          role: user.role || 'student',
          status: user.status || 'active',
          learning_level: user.learning_level || 'Book 1',
          assigned_teacher_id: user.assigned_teacher_id || null,
          can_approve: Boolean(user.can_approve),
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Firestore] Failed to save user:', err);
    }
  },

  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const cleanEmail = String(email).toLowerCase().trim();
      const q = query(collection(firestoreDb, 'users'), where('email', '==', cleanEmail), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data();
      }
      return null;
    } catch (err) {
      console.warn('[Firestore] Failed to query user by email:', err);
      return null;
    }
  },

  async getAllUsers(role?: string): Promise<any[]> {
    try {
      const col = collection(firestoreDb, 'users');
      let q = role ? query(col, where('role', '==', role)) : query(col);
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    } catch (err) {
      console.warn('[Firestore] Failed to fetch users:', err);
      return [];
    }
  },

  // ==========================================
  // SUBMISSIONS
  // ==========================================
  async saveSubmission(sub: any): Promise<string> {
    const id = sub.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const subRef = doc(firestoreDb, 'submissions', id);
    const now = new Date().toISOString();

    const data = {
      id,
      student_id: sub.student_id,
      student_name: sub.student_name || 'Student',
      student_email: sub.student_email || '',
      task_id: sub.task_id,
      task_title: sub.task_title || 'Task',
      task_day: sub.task_day || 1,
      task_book: sub.task_book || 'Book 1',
      task_category: sub.task_category || 'General',
      status: sub.status || 'submitted',
      fb_link: sub.fb_link || null,
      yt_link: sub.yt_link || null,
      li_link: sub.li_link || null,
      insta_link: sub.insta_link || null,
      other_link: sub.other_link || null,
      file_url: sub.file_url || null,
      file_name: sub.file_name || null,
      student_notes: sub.student_notes || null,
      version: sub.version || 1,
      reviewer_id: sub.reviewer_id || null,
      reviewer_name: sub.reviewer_name || null,
      reviewer_feedback: sub.reviewer_feedback || null,
      submitted_at: sub.submitted_at || now,
      updated_at: now,
    };

    await setDoc(subRef, data, { merge: true });
    return id;
  },

  async getSubmissions(params?: { status?: string; student_id?: string }): Promise<any[]> {
    try {
      const col = collection(firestoreDb, 'submissions');
      let q = query(col);
      if (params?.student_id) {
        q = query(col, where('student_id', '==', params.student_id));
      } else if (params?.status) {
        q = query(col, where('status', '==', params.status));
      }
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => d.data());
      // Sort by updated_at descending
      items.sort((a, b) => new Date(b.updated_at || b.submitted_at).getTime() - new Date(a.updated_at || a.submitted_at).getTime());
      return items;
    } catch (err) {
      console.warn('[Firestore] Failed to fetch submissions:', err);
      return [];
    }
  },

  async reviewSubmission(
    id: string,
    decision: string,
    feedback?: string,
    reviewerName?: string
  ): Promise<void> {
    try {
      const subRef = doc(firestoreDb, 'submissions', id);
      const status = decision === 'approve' || decision === 'approved' ? 'approved' : 'needs_correction';
      await updateDoc(subRef, {
        status,
        reviewer_name: reviewerName || 'Farukh Businessman Wala',
        reviewer_feedback: feedback || (status === 'approved' ? 'Approved by Owner' : 'Correction requested'),
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Firestore] Failed to review submission:', err);
    }
  },

  // ==========================================
  // ATTENDANCE
  // ==========================================
  async saveAttendanceSession(session: any): Promise<void> {
    try {
      const id = session.id || `att_${Date.now()}`;
      const attRef = doc(firestoreDb, 'attendance_sessions', id);
      await setDoc(attRef, session, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Failed to save attendance session:', err);
    }
  },

  async getAttendanceSessions(studentId?: string): Promise<any[]> {
    try {
      const col = collection(firestoreDb, 'attendance_sessions');
      let q = studentId
        ? query(col, where('student_id', '==', studentId))
        : query(col);
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => d.data());
      items.sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());
      return items;
    } catch (err) {
      console.warn('[Firestore] Failed to fetch attendance sessions:', err);
      return [];
    }
  },

  // ==========================================
  // CLEAR ALL STUDENTS (OWNER RESET)
  // ==========================================
  async clearAllStudents(): Promise<void> {
    try {
      // 1. Delete student users
      const usersSnap = await getDocs(query(collection(firestoreDb, 'users'), where('role', '==', 'student')));
      for (const d of usersSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 2. Delete submissions
      const subSnap = await getDocs(collection(firestoreDb, 'submissions'));
      for (const d of subSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 3. Delete attendance
      const attSnap = await getDocs(collection(firestoreDb, 'attendance_sessions'));
      for (const d of attSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (err) {
      console.warn('[Firestore] Failed to clear students:', err);
    }
  },
};
