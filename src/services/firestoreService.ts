import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { firestoreDb } from '../firebase';
import { isSubmissionForStudent } from '../utils/studentMatcher';

// Last-known non-empty caches so transient Firestore network blips never wipe or flicker UI lists
let cachedUsers: any[] | null = null;
let cachedSubmissions: any[] | null = null;
let cachedAttendance: any[] | null = null;

function normalizeGmail(em: string): string {
  const parts = String(em || '').toLowerCase().trim().split('@');
  if (parts.length === 2 && (parts[1] === 'gmail.com' || parts[1] === 'googlemail.com')) {
    return `${parts[0].replace(/\./g, '').split('+')[0]}@gmail.com`;
  }
  return String(em || '').toLowerCase().trim();
}

export const firestoreService = {
  // ==========================================
  // USERS & AUTH
  // ==========================================
  async saveUser(user: any): Promise<void> {
    try {
      const cleanEmail = String(user.email || '').toLowerCase().trim();
      if (!cleanEmail) return;
      const docId = user.id || cleanEmail;
      const userRef = doc(firestoreDb, 'users', docId);
      const payload: Record<string, any> = {
        id: docId,
        email: cleanEmail,
        full_name: user.full_name || 'Student',
        whatsapp: user.whatsapp || '',
        role: user.role || 'student',
        status: user.status || 'active',
        learning_level: user.learning_level || 'Book 1',
        assigned_teacher_id: user.assigned_teacher_id ?? null,
        registered_by_id: user.registered_by_id ?? user.assigned_teacher_id ?? null,
        can_approve: Boolean(user.can_approve),
        can_admit: Boolean(user.can_admit),
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (user.father_name !== undefined) {
        payload.father_name = user.father_name;
      }
      if (user.password_hash) {
        payload.password_hash = user.password_hash;
      }
      if (user.salt) {
        payload.salt = user.salt;
      }

      await setDoc(userRef, payload, { merge: true });

      // Keep in-memory cache immediately coherent
      if (cachedUsers) {
        const idx = cachedUsers.findIndex(
          (u) => u.id === docId || String(u.email || '').toLowerCase().trim() === cleanEmail
        );
        if (idx >= 0) {
          cachedUsers[idx] = { ...cachedUsers[idx], ...payload };
        } else {
          cachedUsers = [payload, ...cachedUsers];
        }
      }
    } catch (err) {
      console.warn('[Firestore] Failed to save user:', err);
    }
  },

  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const cleanEmail = String(email).toLowerCase().trim();
      const normalizedTarget = normalizeGmail(cleanEmail);

      // 1. Direct query
      const q = query(collection(firestoreDb, 'users'), where('email', '==', cleanEmail), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data();
      }

      // 2. Fallback: check all users in firestore for case-insensitive, normalized, or alias matches
      const allUsersSnap = await getDocs(collection(firestoreDb, 'users'));
      const allDocs = allUsersSnap.docs.map((d) => d.data());
      if (allDocs.length > 0) {
        cachedUsers = allDocs;
      }
      for (const u of allDocs) {
        const uEmail = String(u.email || '').toLowerCase().trim();
        if (uEmail === cleanEmail || normalizeGmail(uEmail) === normalizedTarget) {
          return u;
        }
        // Check known student spelling variations (e.g. mateenbusnesswala vs mateenbusinesswala)
        if (
          (cleanEmail === 'mateenbusinesswala@gmail.com' && uEmail === 'mateenbusnesswala@gmail.com') ||
          (cleanEmail === 'mateenbusnesswala@gmail.com' && uEmail === 'mateenbusinesswala@gmail.com')
        ) {
          return u;
        }
      }

      return null;
    } catch (err) {
      console.warn('[Firestore] Failed to query user by email:', err);
      if (cachedUsers) {
        const cleanEmail = String(email).toLowerCase().trim();
        const normalizedTarget = normalizeGmail(cleanEmail);
        return (
          cachedUsers.find((u) => {
            const uEmail = String(u.email || '').toLowerCase().trim();
            return uEmail === cleanEmail || normalizeGmail(uEmail) === normalizedTarget;
          }) || null
        );
      }
      return null;
    }
  },

  async getAllUsers(role?: string): Promise<any[]> {
    try {
      const col = collection(firestoreDb, 'users');
      const snap = await getDocs(col);
      const all = snap.docs.map((d) => d.data()).filter((u) => u && u.id !== 'student');
      if (all.length > 0 || cachedUsers === null) {
        cachedUsers = all;
      }
      return role ? all.filter((u) => u.role === role) : all;
    } catch (err) {
      console.warn('[Firestore] Failed to fetch users, returning last cached list:', err);
      const fallback = cachedUsers || [];
      return role ? fallback.filter((u) => u.role === role) : fallback;
    }
  },

  // ==========================================
  // SUBMISSIONS
  // ==========================================
  async saveSubmission(sub: any): Promise<string> {
    const now = new Date().toISOString();

    // Check for an existing unapproved Firestore submission for the same student + task_id
    let existingDoc: any = null;
    if (!sub.id && sub.task_id) {
      try {
        const allSubs = await this.getSubmissions();
        existingDoc = allSubs.find(
          (s) =>
            String(s.task_id) === String(sub.task_id) &&
            isSubmissionForStudent(s, sub.student_id, sub.student_email)
        );
      } catch {
        existingDoc = null;
      }
    }

    if (existingDoc && existingDoc.status === 'approved') {
      throw new Error('This task is already Approved and completed! It cannot be modified.');
    }

    // Identity is mandatory: a submission must never be filed under the shared
    // demo id 'student'. If we don't know who is submitting, fail loudly so the
    // student logs in again instead of colliding with another student's work.
    const ownerStudentId = sub.student_id || existingDoc?.student_id || '';
    if (!ownerStudentId) {
      throw new Error('Your student identity could not be verified. Please log out and log in again, then submit.');
    }

    const id = sub.id || existingDoc?.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nextVersion = existingDoc ? Number(existingDoc.version || 1) + 1 : (sub.version || 1);
    const subRef = doc(firestoreDb, 'submissions', id);

    const data: Record<string, any> = {
      id,
      student_id: ownerStudentId,
      student_name: sub.student_name || existingDoc?.student_name || 'Student',
      student_email: sub.student_email || existingDoc?.student_email || '',
      assigned_teacher_id: sub.assigned_teacher_id ?? existingDoc?.assigned_teacher_id ?? null,
      registered_by_id: sub.registered_by_id ?? existingDoc?.registered_by_id ?? null,
      task_id: sub.task_id,
      task_title: sub.task_title || existingDoc?.task_title || 'Task',
      task_day: sub.task_day || existingDoc?.task_day || 1,
      task_book: sub.task_book || existingDoc?.task_book || 'Book 1',
      task_category: sub.task_category || existingDoc?.task_category || 'General',
      status: sub.status || 'submitted',
      fb_link: sub.fb_link || null,
      yt_link: sub.yt_link || null,
      li_link: sub.li_link || null,
      insta_link: sub.insta_link || null,
      other_link: sub.other_link || null,
      file_url: sub.file_url || null,
      file_name: sub.file_name || null,
      student_notes: sub.student_notes || null,
      version: nextVersion,
      reviewer_id: null,
      reviewer_name: null,
      reviewer_feedback: null,
      reviewed_at: null,
      submitted_at: existingDoc?.submitted_at || sub.submitted_at || now,
      updated_at: now,
    };

    await setDoc(subRef, data, { merge: true });

    if (cachedSubmissions) {
      const idx = cachedSubmissions.findIndex((s) => s.id === id);
      if (idx >= 0) {
        cachedSubmissions[idx] = data;
      } else {
        cachedSubmissions = [data, ...cachedSubmissions];
      }
    }

    return id;
  },

  async getSubmissions(params?: { status?: string; student_id?: string; student_email?: string }): Promise<any[]> {
    try {
      const col = collection(firestoreDb, 'submissions');
      const snap = await getDocs(col);
      const all = snap.docs.map((d) => d.data());
      if (all.length > 0 || cachedSubmissions === null) {
        cachedSubmissions = all;
      }

      let items = [...all];
      if (params?.status && params.status !== 'all') {
        items = items.filter((s) => s.status === params.status);
      }
      if (params?.student_id || params?.student_email) {
        items = items.filter((s) => isSubmissionForStudent(s, params.student_id, params.student_email));
      }

      items.sort(
        (a, b) =>
          new Date(b.updated_at || b.submitted_at || 0).getTime() -
          new Date(a.updated_at || a.submitted_at || 0).getTime()
      );
      return items;
    } catch (err) {
      console.warn('[Firestore] Failed to fetch submissions, returning last cached list:', err);
      let items = [...(cachedSubmissions || [])];
      if (params?.status && params.status !== 'all') {
        items = items.filter((s) => s.status === params.status);
      }
      if (params?.student_id || params?.student_email) {
        items = items.filter((s) => isSubmissionForStudent(s, params.student_id, params.student_email));
      }
      return items;
    }
  },

  async reviewSubmission(
    id: string,
    decision: string,
    feedback?: string,
    reviewerName?: string,
    reviewerId?: string,
    snapshot?: any
  ): Promise<void> {
    try {
      const subRef = doc(firestoreDb, 'submissions', id);
      const status = decision === 'approve' || decision === 'approved' ? 'approved' : 'needs_correction';
      const now = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        ...(snapshot ? {
          id,
          student_id: snapshot.student_id,
          student_name: snapshot.student_name || 'Student',
          student_email: snapshot.student_email || '',
          task_id: snapshot.task_id,
          task_title: snapshot.task_title || 'Task',
          task_day: snapshot.task_day || 1,
          task_book: snapshot.task_book || 'Book 1',
          task_category: snapshot.task_category || 'General',
          fb_link: snapshot.fb_link || null,
          yt_link: snapshot.yt_link || null,
          li_link: snapshot.li_link || null,
          insta_link: snapshot.insta_link || null,
          other_link: snapshot.other_link || null,
          file_url: snapshot.file_url || null,
          file_name: snapshot.file_name || null,
          student_notes: snapshot.student_notes || null,
          submitted_at: snapshot.submitted_at || now,
        } : {}),
        status,
        reviewer_id: reviewerId || null,
        reviewer_name: reviewerName || 'Farukh Businessman Wala',
        reviewer_feedback: feedback?.trim() || (status === 'approved' ? 'Approved' : 'Correction requested'),
        reviewed_at: now,
        updated_at: now,
      };
      await setDoc(subRef, updatePayload, { merge: true });

      if (cachedSubmissions) {
        const idx = cachedSubmissions.findIndex((s) => s.id === id);
        if (idx >= 0) {
          cachedSubmissions[idx] = { ...cachedSubmissions[idx], ...updatePayload };
        }
      }
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
      if (cachedAttendance) {
        const idx = cachedAttendance.findIndex((a) => a.id === id);
        if (idx >= 0) cachedAttendance[idx] = session;
        else cachedAttendance = [session, ...cachedAttendance];
      }
    } catch (err) {
      console.warn('[Firestore] Failed to save attendance session:', err);
    }
  },

  async getAttendanceSessions(studentId?: string): Promise<any[]> {
    try {
      const col = collection(firestoreDb, 'attendance_sessions');
      const snap = await getDocs(col);
      const all = snap.docs.map((d) => d.data());
      if (all.length > 0 || cachedAttendance === null) {
        cachedAttendance = all;
      }
      let items = [...all];
      if (studentId) {
        const sId = String(studentId).trim();
        // Same-person legacy id pair only (one student, two historical ids).
        // Name-based matching was removed: names are not identity.
        const samePersonIds = ['0e5e0061-f2ac-4ff6-8085-4d6d575938b9', 'std_1793115797698_qvwb'];
        const isLegacyPairMember = samePersonIds.includes(sId);

        items = items.filter((a) => {
          if (String(a.student_id) === sId) return true;
          if (isLegacyPairMember && samePersonIds.includes(String(a.student_id))) {
            return true;
          }
          return false;
        });
      }
      items.sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());
      return items;
    } catch (err) {
      console.warn('[Firestore] Failed to fetch attendance sessions:', err);
      return cachedAttendance || [];
    }
  },

  // ==========================================
  // CLEAR ALL STUDENTS (OWNER RESET)
  // ==========================================
  async clearAllStudents(): Promise<void> {
    try {
      const usersSnap = await getDocs(query(collection(firestoreDb, 'users'), where('role', '==', 'student')));
      for (const d of usersSnap.docs) {
        await deleteDoc(d.ref);
      }
      const subSnap = await getDocs(collection(firestoreDb, 'submissions'));
      for (const d of subSnap.docs) {
        await deleteDoc(d.ref);
      }
      const attSnap = await getDocs(collection(firestoreDb, 'attendance_sessions'));
      for (const d of attSnap.docs) {
        await deleteDoc(d.ref);
      }
      cachedUsers = null;
      cachedSubmissions = null;
      cachedAttendance = null;
    } catch (err) {
      console.warn('[Firestore] Failed to clear students:', err);
    }
  },
};
