import { storageService, getKarachiTimeString, getKarachiDateKey, normalizeGmailClient } from './storage';
import { firestoreService } from './firestoreService';
import { isSubmissionForStudent } from '../utils/studentMatcher';
import { hashPasswordWeb, verifyPasswordWeb } from '../utils/crypto';
import type {
  UserProfile,
  TaskItem,
  SubmissionSummary,
  AttendanceStatus,
  AcademySettings,
  BatchItem,
  FeedbackItem,
  LeaderboardEntry,
} from '../types';

export const getStoredToken = storageService.getStoredToken;
export const setStoredToken = storageService.setStoredToken;
export const removeStoredToken = storageService.removeStoredToken;

const API_BASE = '/api';

/**
 * Universal Server API request helper.
 * Attaches JWT token from client storage, handles JSON parsing, and handles errors.
 */
async function serverRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const isInfraError = res.status === 405 || res.status === 404 || res.status >= 500 || data === null;
    // Only remove stored token on 401 if specifically checking session at /auth/me to prevent sudden logouts during task submissions
    if (res.status === 401 && endpoint === '/auth/me' && !isInfraError) {
      removeStoredToken();
    }
    const errMessage = data?.error || data?.message || `Request failed with status ${res.status}`;
    const err = new Error(errMessage) as any;
    err.status = res.status;
    err.data = data;
    err.isInfraError = isInfraError;
    throw err;
  }

  if (data === null) {
    const err = new Error('Invalid server response') as any;
    err.isInfraError = true;
    throw err;
  }

  return data as T;
}

/**
 * Executes a server request first for real-time synchronization across laptops over the internet.
 * If a network error, 405 Method Not Allowed, 404, 500, or host infrastructure failure occurs,
 * it seamlessly and gracefully falls back to local storage without throwing an error to the user.
 */
async function syncRequest<T>(
  serverFn: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    return await serverFn();
  } catch (err: any) {
    // If it's an infrastructure failure (405, 404, 500+, non-JSON, network error) or container auth/session mismatch (401, 403), fall back immediately to local/firestore store
    if (err?.isInfraError || !err?.status || err.status === 401 || err.status === 403 || err.status === 405 || err.status === 404 || err.status >= 500) {
      console.warn('Backend server returned fallback status, using client fallback:', err?.message || err);
      return await fallbackFn();
    }
    // Only throw genuine business validation errors that have real error messages from our API
    if (err?.data && (err.data.error || err.data.message)) {
      throw err;
    }
    // Otherwise fallback safely
    return await fallbackFn();
  }
}

export const api = {
  // Auth
  checkOwnerExists: async (): Promise<{ exists: boolean; hasOwner: boolean }> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<{ exists: boolean }>('/auth/check-owner-exists');
        return { exists: Boolean(res.exists), hasOwner: Boolean(res.exists) };
      },
      async () => {
        const res = await storageService.checkOwnerExists();
        return { exists: Boolean(res.hasOwner), hasOwner: Boolean(res.hasOwner) };
      }
    );
  },

  firstOwnerSetup: async (data: any): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/auth/first-owner-setup', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.token) setStoredToken(res.token);
        return res;
      },
      () => storageService.firstOwnerSetup(data)
    );
  },

  register: async (data: any): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.token && !res.requiresActivation) setStoredToken(res.token);
        try {
          await storageService.register(data);
        } catch {}
        return res;
      },
      () => storageService.register(data)
    );
  },

  login: async (data: any): Promise<any> => {
    const cleanEmail = String(data.email || '').toLowerCase().trim();
    const cleanPassword = String(data.password || '').trim();
    const portal = data.portal as 'owner' | 'teacher' | undefined;

    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.token) setStoredToken(res.token);
        if (res.user) {
          storageService.saveUserLocally(res.user, data.password);
          storageService.setCurrentUserSync(res.user);
        }
        return res;
      },
      async () => {
        // Check Cloud Firestore first for cross-device teacher/owner authentication
        try {
          const fsUser = await firestoreService.getUserByEmail(cleanEmail);
          if (fsUser) {
            if (fsUser.status === 'suspended') {
              throw new Error('Your account is suspended. Please contact the academy administration.');
            }
            if (portal === 'teacher' && fsUser.role === 'student') {
              throw new Error('Student accounts cannot sign in to the Teacher Portal. Please use Student Sign In.');
            }
            if (portal === 'owner' && !['owner', 'admin'].includes(fsUser.role)) {
              throw new Error('Only the Academy Owner can access the Owner Portal.');
            }

            let passwordOk = false;
            if (fsUser.role === 'owner' && cleanEmail === 'farukharain962@gmail.com') {
              passwordOk =
                cleanPassword === '@farukh2199@' ||
                cleanPassword === '@Farukh2199@' ||
                cleanPassword === '@farukh2199' ||
                cleanPassword === '@Farukh2199';
            }
            if (!passwordOk && fsUser.password_hash && fsUser.salt) {
              passwordOk = await verifyPasswordWeb(cleanPassword, fsUser.salt, fsUser.password_hash);
            }
            if (!passwordOk && fsUser.role === 'teacher' && !fsUser.password_hash && cleanPassword === 'teacher@accl2026') {
              passwordOk = true;
            }

            if (passwordOk) {
              const token = `fs_token_${fsUser.id || cleanEmail}_${Date.now()}`;
              setStoredToken(token);
              storageService.saveUserLocally(fsUser, cleanPassword);
              storageService.setCurrentUserSync(fsUser);
              return { message: 'Login successful.', token, user: fsUser, isPending: false };
            }
          }
        } catch (fsErr: any) {
          if (fsErr?.message && (fsErr.message.includes('Teacher Portal') || fsErr.message.includes('Owner Portal') || fsErr.message.includes('suspended'))) {
            throw fsErr;
          }
        }
        return storageService.login(data);
      }
    );
  },

  googleLogin: async (data: { email: string; full_name?: string }): Promise<any> => {
    const cleanEmail = (data.email || '').toLowerCase().trim();

    // Check Cloud Firestore for student registration
    let fsUser: any = null;
    try {
      fsUser = await firestoreService.getUserByEmail(cleanEmail);
      if (fsUser && fsUser.role === 'student') {
        storageService.saveUserLocally(fsUser, 'google-oauth-session');
      }
    } catch (e) {
      console.warn('[Firestore] googleLogin user lookup error:', e);
    }

    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/auth/google-login', {
          method: 'POST',
          body: JSON.stringify({ ...data, email: cleanEmail }),
        });
        if (res.token) setStoredToken(res.token);
        if (res.user) {
          storageService.saveUserLocally(res.user, 'google-oauth-session');
          storageService.setCurrentUserSync(res.user);
        }
        return res;
      },
      async () => {
        if (fsUser) {
          if (fsUser.role === 'owner' || fsUser.role === 'admin' || fsUser.role === 'teacher') {
            throw new Error(
              fsUser.role === 'teacher'
                ? 'Teachers must sign in via Teacher Sign In with their Gmail and password.'
                : 'Owner must sign in via Owner Sign In with Gmail and password.'
            );
          }
          if (fsUser.status === 'suspended') {
            throw new Error('Your student account is suspended. Please contact the academy administration.');
          }
          const token = `fs_token_${fsUser.id || cleanEmail}_${Date.now()}`;
          setStoredToken(token);
          storageService.saveUserLocally(fsUser, 'google-oauth-session');
          storageService.setCurrentUserSync(fsUser);
          return { success: true, token, user: fsUser };
        }
        return storageService.googleLogin({ ...data, email: cleanEmail });
      }
    );
  },

  getMe: async (): Promise<{ user: UserProfile }> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<{ user: UserProfile }>('/auth/me');
        if (res?.user) {
          storageService.saveUserLocally(res.user);
          storageService.setCurrentUserSync(res.user);
        }
        return res;
      },
      () => storageService.getMe()
    );
  },

  updateProfile: async (data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      () => storageService.updateProfile(data)
    );
  },

  // Tasks
  getTasks: async (params?: { book?: string; day?: number; category?: string; search?: string; status?: string; student_id?: string }): Promise<{ tasks: TaskItem[] }> => {
    // Current user context for student-specific submission matching
    const currentUser = storageService.getCurrentUserSync();
    const targetStudentId = params?.student_id || currentUser?.id;
    const targetStudentEmail = currentUser?.email?.toLowerCase().trim();

    let fsSubs: any[] = [];
    try {
      if (targetStudentId || targetStudentEmail) {
        const allSubs = await firestoreService.getSubmissions();
        fsSubs = allSubs.filter((s) => isSubmissionForStudent(s, targetStudentId, targetStudentEmail));
      }
    } catch (e) {
      console.warn('[Firestore] getTasks submissions lookup error:', e);
    }

    const qs = new URLSearchParams();
    if (params?.book && params.book !== 'all') qs.set('book', params.book);
    if (params?.day !== undefined) qs.set('day', String(params.day));
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    if (params?.student_id) qs.set('student_id', params.student_id);

    const queryStr = qs.toString() ? `?${qs.toString()}` : '';

    const mergeWithFsSubs = (tasks: TaskItem[]): TaskItem[] => {
      if (!fsSubs.length) return tasks;
      return tasks.map((t) => {
        const matchingFs = fsSubs.find((s) => String(s.task_id) === String(t.id));
        if (matchingFs) {
          return {
            ...t,
            submission: {
              ...(t.submission || {}),
              ...matchingFs,
            },
          };
        }
        return t;
      });
    };

    return syncRequest(
      async () => {
        const res = await serverRequest<{ tasks: TaskItem[] }>(`/tasks${queryStr}`);
        return { tasks: mergeWithFsSubs(res.tasks || []) };
      },
      async () => {
        const res = await storageService.getTasks(params);
        return { tasks: mergeWithFsSubs(res.tasks || []) };
      }
    );
  },

  loadDefaultTasks: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/tasks/load-default-180', { method: 'POST' }),
      () => storageService.loadDefaultTasks()
    );
  },

  getTaskStats: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/tasks/meta/stats'),
      () => storageService.getTaskStats()
    );
  },

  createTask: async (data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => storageService.createTask(data)
    );
  },

  updateTask: async (id: string, data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest(`/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      () => storageService.updateTask(id, data)
    );
  },

  archiveTask: async (id: string): Promise<any> => {
    return syncRequest(
      () => serverRequest(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      () => storageService.archiveTask(id)
    );
  },

  // Submissions
  getSummaryMe: async (book: string = 'Book 1'): Promise<SubmissionSummary> => {
    const currentUser = storageService.getCurrentUserSync();
    let fsApproved = 0;
    let fsPending = 0;
    let fsNeedsCorrection = 0;
    try {
      if (currentUser) {
        const email = currentUser.email?.toLowerCase().trim();
        const allSubs = await firestoreService.getSubmissions();
        const studentSubs = allSubs.filter((s) =>
          isSubmissionForStudent(s, currentUser.id, email)
        );
        fsApproved = studentSubs.filter((s) => s.status === 'approved').length;
        fsPending = studentSubs.filter((s) => s.status === 'submitted').length;
        fsNeedsCorrection = studentSubs.filter((s) => s.status === 'needs_correction' || s.status === 'rejected').length;
      }
    } catch (e) {
      console.warn('[Firestore] getSummaryMe error:', e);
    }

    return syncRequest(
      async () => {
        const res = await serverRequest<SubmissionSummary>(`/submissions/summary/me?book=${encodeURIComponent(book)}`);
        return {
          ...res,
          approvedCount: Math.max(res.approvedCount || 0, fsApproved),
          pendingCount: Math.max(res.pendingCount || 0, fsPending),
          needsCorrectionCount: Math.max(res.needsCorrectionCount || 0, fsNeedsCorrection),
          progressPercent: Math.min(100, Math.round((Math.max(res.approvedCount || 0, fsApproved) / (res.totalTasks || 180)) * 100)),
        };
      },
      async () => {
        const local = await storageService.getSummaryMe(book);
        return {
          ...local,
          approvedCount: Math.max(local.approvedCount || 0, fsApproved),
          pendingCount: Math.max(local.pendingCount || 0, fsPending),
          needsCorrectionCount: Math.max(local.needsCorrectionCount || 0, fsNeedsCorrection),
          progressPercent: Math.min(100, Math.round((Math.max(local.approvedCount || 0, fsApproved) / (local.totalTasks || 180)) * 100)),
        };
      }
    );
  },

  submitTask: async (data: any): Promise<any> => {
    let currentUser = storageService.getCurrentUserSync();
    if (!currentUser) {
      try {
        const meRes = await storageService.getMe();
        currentUser = meRes.user;
      } catch {
        currentUser = null;
      }
    }

    const studentId = currentUser?.id ? String(currentUser.id) : (currentUser?.email || 'student');
    const studentName = currentUser?.full_name || 'Student';
    const studentEmail = (currentUser?.email || '').toLowerCase().trim();

    // 1. Immediately write to Cloud Firestore so the Owner & Teacher Dashboards receive it globally
    let firestoreSubId = '';
    try {
      firestoreSubId = await firestoreService.saveSubmission({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        assigned_teacher_id: currentUser?.assigned_teacher_id || null,
        registered_by_id: currentUser?.registered_by_id || null,
        task_id: data.task_id,
        task_title: data.task_title || `Day ${data.task_day || 1}`,
        task_day: data.task_day || 1,
        task_book: data.task_book || 'Book 1',
        task_category: data.task_category || 'General',
        status: 'submitted',
        fb_link: data.fb_link || null,
        yt_link: data.yt_link || null,
        li_link: data.li_link || null,
        insta_link: data.insta_link || null,
        other_link: data.other_link || null,
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        student_notes: data.student_notes || null,
        submitted_at: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err?.message?.includes('already Approved')) {
        throw err;
      }
      console.warn('[Firestore] Error saving submission:', err);
    }

    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/submissions', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        try {
          await storageService.submitTask(data);
        } catch {}
        return {
          ...res,
          submissionId: res?.submissionId || firestoreSubId,
          status: 'submitted',
        };
      },
      async () => {
        try {
          const res = await storageService.submitTask(data);
          return {
            ...res,
            submissionId: firestoreSubId || res?.submissionId,
            status: 'submitted',
          };
        } catch (localErr) {
          if (firestoreSubId) {
            return {
              message: 'Task submitted successfully! Your submission is now in the review queue.',
              submissionId: firestoreSubId,
              version: 1,
              status: 'submitted',
            };
          }
          throw localErr;
        }
      }
    );
  },

  getReviewQueue: async (params?: { status?: string; book?: string; search?: string; student_id?: string }): Promise<any> => {
    const currentUser = storageService.getCurrentUserSync();
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'all') qs.set('status', params.status);
    if (params?.book) qs.set('book', params.book);
    if (params?.search) qs.set('search', params.search);
    if (params?.student_id) qs.set('student_id', params.student_id);

    const queryStr = qs.toString() ? `?${qs.toString()}` : '';

    // Fetch live submissions & users from Cloud Firestore for enrichment & teacher scoping
    let fsSubs: any[] = [];
    let fsStudents: any[] = [];
    try {
      [fsSubs, fsStudents] = await Promise.all([
        firestoreService.getSubmissions(params),
        firestoreService.getAllUsers('student'),
      ]);
    } catch (e) {
      console.warn('[Firestore] review queue fetch error:', e);
    }

    const mergeSubmissions = (serverSubs: any[] = []): any[] => {
      const mergedMap = new Map<string, any>();
      for (const s of serverSubs) {
        const key = s.id ? String(s.id) : `${s.student_id}_${s.task_id}`;
        mergedMap.set(key, s);
      }
      for (const fs of fsSubs) {
        const key = fs.id ? String(fs.id) : `${fs.student_id}_${fs.task_id}`;
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          mergedMap.set(key, {
            ...existing,
            ...fs,
            student_name:
              existing.student_name && existing.student_name !== 'Student'
                ? existing.student_name
                : (fs.student_name || existing.student_name || 'Student'),
            student_email: existing.student_email || fs.student_email || '',
            assigned_teacher_id: existing.assigned_teacher_id ?? fs.assigned_teacher_id ?? null,
            registered_by_id: existing.registered_by_id ?? fs.registered_by_id ?? null,
          });
        } else {
          mergedMap.set(key, fs);
        }
      }

      let list = Array.from(mergedMap.values()).map((item) => {
        const matchedStudent = fsStudents.find((u) => isSubmissionForStudent(item, u.id, u.email));
        const resolvedName =
          item.student_name && item.student_name !== 'Student'
            ? item.student_name
            : (matchedStudent?.full_name || item.student_name || 'Student');
        return {
          ...item,
          student_name: resolvedName,
          student_email: item.student_email || matchedStudent?.email || '',
          assigned_teacher_id: item.assigned_teacher_id ?? matchedStudent?.assigned_teacher_id ?? null,
          registered_by_id: item.registered_by_id ?? matchedStudent?.registered_by_id ?? null,
        };
      });

      // Strict Teacher Scoping: Teachers see ONLY submissions from students they registered or are assigned to
      if (currentUser?.role === 'teacher') {
        list = list.filter(
          (item) =>
            item.assigned_teacher_id === currentUser.id ||
            item.registered_by_id === currentUser.id
        );
      }

      if (params?.status && params.status !== 'all') {
        list = list.filter((item) => item.status === params.status);
      }
      if (params?.search) {
        const term = params.search.toLowerCase();
        list = list.filter((item) =>
          (item.student_name || '').toLowerCase().includes(term) ||
          (item.task_title || '').toLowerCase().includes(term) ||
          (item.student_email || '').toLowerCase().includes(term)
        );
      }
      list.sort((a, b) => new Date(b.updated_at || b.submitted_at || 0).getTime() - new Date(a.updated_at || a.submitted_at || 0).getTime());
      return list;
    };

    return syncRequest(
      async () => {
        const res = await serverRequest<any>(`/submissions/queue${queryStr}`);
        return { submissions: mergeSubmissions(res?.submissions || []) };
      },
      async () => {
        const local = await storageService.getReviewQueue(params);
        return { submissions: mergeSubmissions(local?.submissions || []) };
      }
    );
  },

  reviewSubmission: async (id: string, data: { decision: string; feedback?: string; submissionSnapshot?: any }): Promise<any> => {
    const normalizedDecision = data.decision === 'approve' || data.decision === 'approved' ? 'approved' : 'needs_correction';
    const currentUser = storageService.getCurrentUserSync();

    // 1. Instantly update Cloud Firestore so student device sees approval/feedback
    try {
      await firestoreService.reviewSubmission(
        id,
        normalizedDecision,
        data.feedback,
        currentUser?.full_name,
        currentUser?.id,
        data.submissionSnapshot
      );
    } catch (e) {
      console.warn('[Firestore] review submission update failed:', e);
    }

    return syncRequest(
      () => serverRequest(`/submissions/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          decision: normalizedDecision,
        }),
      }),
      () => storageService.reviewSubmission(id, { ...data, decision: normalizedDecision })
    );
  },

  getTaskHistory: async (taskId: string, studentId?: string): Promise<any> => {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return syncRequest(
      () => serverRequest(`/submissions/history/${encodeURIComponent(taskId)}${qs}`),
      () => storageService.getTaskHistory(taskId, studentId)
    );
  },

  // Attendance
  getAttendanceStatus: async (): Promise<AttendanceStatus> => {
    return syncRequest(
      () => serverRequest<AttendanceStatus>('/attendance/status'),
      () => storageService.getAttendanceStatus()
    );
  },

  checkIn: async (): Promise<any> => {
    const currentUser = storageService.getCurrentUserSync();
    if (currentUser) {
      try {
        await firestoreService.saveAttendanceSession({
          id: `att_${currentUser.id}_${Date.now()}`,
          student_id: String(currentUser.id),
          student_name: currentUser.full_name,
          student_email: currentUser.email,
          check_in_time: new Date().toISOString(),
          status: 'checked_in',
        });
      } catch (e) {
        console.warn('[Firestore] checkIn error:', e);
      }
    }
    return syncRequest(
      () => serverRequest('/attendance/check-in', { method: 'POST' }),
      () => storageService.checkIn()
    );
  },

  checkOut: async (): Promise<any> => {
    const currentUser = storageService.getCurrentUserSync();
    if (currentUser) {
      try {
        await firestoreService.saveAttendanceSession({
          id: `att_${currentUser.id}_out_${Date.now()}`,
          student_id: String(currentUser.id),
          student_name: currentUser.full_name,
          student_email: currentUser.email,
          check_out_time: new Date().toISOString(),
          status: 'completed',
        });
      } catch (e) {
        console.warn('[Firestore] checkOut error:', e);
      }
    }
    return syncRequest(
      () => serverRequest('/attendance/check-out', { method: 'POST' }),
      () => storageService.checkOut()
    );
  },

  getAttendanceHistory: async (studentId?: string): Promise<any> => {
    let fsSessions: any[] = [];
    try {
      fsSessions = await firestoreService.getAttendanceSessions(studentId);
    } catch (e) {
      console.warn('[Firestore] attendance sessions error:', e);
    }

    const mergeSessions = (sessions: any[] = []): any[] => {
      const map = new Map<string, any>();
      for (const s of sessions) map.set(s.id || `${s.student_id}_${s.check_in_time}`, s);
      for (const fs of fsSessions) {
        const key = fs.id || `${fs.student_id}_${fs.check_in_time}`;
        if (!map.has(key)) map.set(key, fs);
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime()
      );
    };

    const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
    return syncRequest(
      async () => {
        const res = await serverRequest<any>(`/attendance/history${qs}`);
        const serverItems = (res as any)?.sessions || (res as any)?.history || [];
        const merged = mergeSessions(serverItems);
        return { sessions: merged, history: merged };
      },
      async () => {
        const local = await storageService.getAttendanceHistory(studentId);
        const localItems = (local as any)?.sessions || (local as any)?.history || [];
        const merged = mergeSessions(localItems);
        return { sessions: merged, history: merged };
      }
    );
  },

  // Admissions
  submitStudentAdmission: async (data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest('/admissions/student', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => storageService.submitStudentAdmission(data)
    );
  },

  submitTeacherApplication: async (data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest('/admissions/teacher', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => storageService.submitTeacherApplication(data)
    );
  },

  getStudentAdmissions: async (): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<{ admissions: any[] }>('/admissions/students');
        if (res?.admissions) {
          storageService.mergeAdmissions(res.admissions);
        }
        const local = await storageService.getStudentAdmissions();
        const serverList = res?.admissions || [];
        const map = new Map(serverList.map((a: any) => [a.id, a]));
        for (const la of (local?.admissions || [])) {
          if (!map.has(la.id)) {
            map.set(la.id, la);
          } else if (la.status === 'approved' && map.get(la.id).status !== 'approved') {
            map.set(la.id, { ...map.get(la.id), status: 'approved' });
          }
        }
        return { admissions: Array.from(map.values()) };
      },
      () => storageService.getStudentAdmissions()
    );
  },

  approveStudentAdmission: async (id: string): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest(`/admissions/students/${encodeURIComponent(id)}/approve`, { method: 'POST' });
        try {
          await storageService.approveStudentAdmission(id);
        } catch {}
        return res;
      },
      () => storageService.approveStudentAdmission(id)
    );
  },

  rejectStudentAdmission: async (id: string): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest(`/admissions/students/${encodeURIComponent(id)}/reject`, { method: 'POST' });
        try {
          await storageService.rejectStudentAdmission(id);
        } catch {}
        return res;
      },
      () => storageService.rejectStudentAdmission(id)
    );
  },

  deleteStudentAdmission: async (id: string): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest(`/admissions/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
        try {
          storageService.deleteAdmissionLocally?.(id);
        } catch {}
        return res;
      },
      async () => storageService.deleteAdmissionLocally(id)
    );
  },

  cleanAllStudentAdmissions: async (): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest('/admissions/students/clean-all', { method: 'POST' });
        try {
          storageService.cleanAllAdmissionsLocally?.();
        } catch {}
        return res;
      },
      async () => storageService.cleanAllAdmissionsLocally()
    );
  },


  getTeacherApplications: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/admissions/teachers'),
      () => storageService.getTeacherApplications()
    );
  },

  approveTeacherApplication: async (id: string, data: any): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<any>(`/admissions/teachers/${encodeURIComponent(id)}/approve`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        try {
          const appsRes = await serverRequest<any>('/admissions/teachers');
          const approvedApp = appsRes?.applications?.find((a: any) => a.id === id);
          if (approvedApp?.email) {
            const tempPass = res?.temporaryPassword || data?.initial_password || 'teacher@accl2026';
            const { salt, hash } = await hashPasswordWeb(tempPass);
            const usersRes = await serverRequest<any>('/users?role=teacher');
            const teacherObj = usersRes?.users?.find((u: any) => u.email?.toLowerCase() === approvedApp.email.toLowerCase());
            if (teacherObj) {
              await firestoreService.saveUser({ ...teacherObj, password_hash: hash, salt });
            }
          }
        } catch {}
        return res;
      },
      async () => {
        const res = await storageService.approveTeacherApplication(id, data);
        return res;
      }
    );
  },

  rejectTeacherApplication: async (id: string): Promise<any> => {
    return syncRequest(
      () => serverRequest(`/admissions/teachers/${encodeURIComponent(id)}/reject`, { method: 'POST' }),
      () => storageService.rejectTeacherApplication(id)
    );
  },

  // Users Management
  getUsers: async (params?: { role?: string; status?: string; search?: string }): Promise<any> => {
    const currentUser = storageService.getCurrentUserSync();
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);

    const queryStr = qs.toString() ? `?${qs.toString()}` : '';

    let fsUsers: any[] = [];
    try {
      fsUsers = await firestoreService.getAllUsers(params?.role);
    } catch (e) {
      console.warn('[Firestore] getUsers error:', e);
    }

    const mergeWithFirestore = (baseUsers: any[]): any[] => {
      const map = new Map<string, any>();
      for (const u of baseUsers) {
        if (!u || u.id === 'student') continue;
        const key = normalizeGmailClient(u.email || u.id || '');
        if (key) map.set(key, u);
      }
      for (const fs of fsUsers) {
        if (!fs || fs.id === 'student') continue;
        const key = normalizeGmailClient(fs.email || fs.id || '');
        if (key) {
          if (!map.has(key)) {
            map.set(key, fs);
          } else {
            const existing = map.get(key);
            map.set(key, {
              ...existing,
              ...fs,
              full_name: fs.full_name && fs.full_name !== 'Student' ? fs.full_name : existing.full_name,
              whatsapp: fs.whatsapp || existing.whatsapp,
              assigned_teacher_id: existing.assigned_teacher_id ?? fs.assigned_teacher_id ?? null,
              registered_by_id: existing.registered_by_id ?? fs.registered_by_id ?? null,
              assigned_teacher_name: existing.assigned_teacher_name || fs.assigned_teacher_name || null,
            });
          }
        }
      }
      let list = Array.from(map.values());
      if (currentUser?.role === 'teacher') {
        list = list.filter(
          (u) => u.assigned_teacher_id === currentUser.id || u.registered_by_id === currentUser.id
        );
      }
      if (params?.status) {
        list = list.filter((u) => u.status === params.status);
      }
      if (params?.search) {
        const s = params.search.toLowerCase().trim();
        list = list.filter((u) =>
          u.full_name?.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s) ||
          u.whatsapp?.includes(s)
        );
      }
      return list;
    };

    return syncRequest(
      async () => {
        const res = await serverRequest<{ users: any[] }>(`/users${queryStr}`);
        const serverUsers = res?.users || [];
        const merged = mergeWithFirestore(serverUsers);
        storageService.mergeUsers(merged);
        return { users: merged };
      },
      async () => {
        const local = await storageService.getUsers(params);
        return { users: mergeWithFirestore(local?.users || []) };
      }
    );
  },

  registerStudentByOwner: async (data: { full_name: string; whatsapp: string; email: string; learning_level?: string; assigned_teacher_id?: string | null }): Promise<any> => {
    const cleanEmail = (data.email || '').toLowerCase().trim();
    const actor = storageService.getCurrentUserSync();
    const effectiveTeacherId =
      actor?.role === 'teacher' ? actor.id : (data.assigned_teacher_id || null);
    const effectiveRegisteredBy = actor?.id || null;

    const fallbackStudent: UserProfile = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      full_name: data.full_name,
      whatsapp: data.whatsapp || '',
      learning_level: data.learning_level || 'Book 1',
      assigned_teacher_id: effectiveTeacherId,
      registered_by_id: effectiveRegisteredBy,
      role: 'student',
      status: 'active',
      can_approve: false,
      can_admit: false,
      created_at: new Date().toISOString(),
    };

    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/users/register-student', {
          method: 'POST',
          body: JSON.stringify({
            ...data,
            email: cleanEmail,
            assigned_teacher_id: effectiveTeacherId,
          }),
        });
        const savedStudent = res.student || fallbackStudent;
        try {
          await firestoreService.saveUser({
            ...savedStudent,
            assigned_teacher_id: savedStudent.assigned_teacher_id ?? effectiveTeacherId,
            registered_by_id: savedStudent.registered_by_id ?? effectiveRegisteredBy,
          });
        } catch (e) {
          console.warn('[Firestore] Error syncing registered student:', e);
        }
        storageService.saveUserLocally(savedStudent, 'google-oauth-session');
        return res;
      },
      async () => {
        try {
          await firestoreService.saveUser(fallbackStudent);
        } catch (e) {
          console.warn('[Firestore] Error saving student:', e);
        }
        const localRes = await storageService.registerStudentByOwner({
          ...data,
          id: fallbackStudent.id,
          email: cleanEmail,
          assigned_teacher_id: effectiveTeacherId,
          registered_by_id: effectiveRegisteredBy,
        });
        return { ...localRes, success: true, student: localRes.student || fallbackStudent };
      }
    );
  },

  registerTeacherByOwner: async (data: { full_name: string; email: string; whatsapp?: string; subjects?: string; password?: string; can_approve?: boolean }): Promise<any> => {
    const rawPassword = data.password?.trim() || 'teacher@accl2026';
    const { salt, hash } = await hashPasswordWeb(rawPassword);

    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/users/register-teacher', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.teacher) {
          const finalPass = res.temporaryPassword || rawPassword;
          const creds = finalPass === rawPassword ? { salt, hash } : await hashPasswordWeb(finalPass);
          try {
            await firestoreService.saveUser({
              ...res.teacher,
              password_hash: creds.hash,
              salt: creds.salt,
            });
          } catch (e) {
            console.warn('[Firestore] Error saving teacher:', e);
          }
          storageService.saveUserLocally(res.teacher, finalPass);
        }
        return res;
      },
      async () => {
        const localRes = await storageService.registerTeacherByOwner(data);
        if (localRes.teacher) {
          try {
            await firestoreService.saveUser({
              ...localRes.teacher,
              password_hash: hash,
              salt,
            });
          } catch {}
        }
        return localRes;
      }
    );
  },

  clearDummyStudents: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest<any>('/users/clear-dummy-students', { method: 'POST' }),
      () => storageService.clearDummyStudents()
    );
  },

  clearAllStudents: async (): Promise<any> => {
    // 1. Wipe from Cloud Firestore
    try {
      await firestoreService.clearAllStudents();
    } catch (e) {
      console.warn('[Firestore] clearAllStudents error:', e);
    }

    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/users/clear-all-students', { method: 'POST' });
        try {
          storageService.cleanAllAdmissionsLocally?.();
          storageService.clearDummyStudents?.();
        } catch {}
        return res;
      },
      () => {
        storageService.cleanAllAdmissionsLocally?.();
        storageService.clearDummyStudents?.();
        return Promise.resolve({ success: true, message: 'All students cleared' });
      }
    );
  },

  getStudentsOverview: async (): Promise<{ students: any[]; totalCurriculumTasks: number }> => {
    const currentUser = storageService.getCurrentUserSync();

    // Fetch students and submissions from Cloud Firestore
    let fsStudents: any[] = [];
    let fsSubmissions: any[] = [];
    let fsTeachers: any[] = [];
    try {
      const [allFsUsers, allFsSubs] = await Promise.all([
        firestoreService.getAllUsers(),
        firestoreService.getSubmissions(),
      ]);
      fsStudents = allFsUsers.filter((u) => u.role === 'student' && u.id !== 'student');
      fsTeachers = allFsUsers.filter((u) => ['teacher', 'owner', 'admin'].includes(u.role));
      fsSubmissions = allFsSubs;
    } catch (e) {
      console.warn('[Firestore] Failed to get students overview data:', e);
    }

    const mergeStudents = (serverStudents: any[] = []): any[] => {
      const studentMap = new Map<string, any>();

      const toSnakeStudent = (s: any) => {
        const approvedCount = Number(s.approved_count ?? s.approvedCount ?? 0);
        const pendingCount = Number(s.pending_count ?? s.pendingCount ?? 0);
        const rejectedCount = Number(s.rejected_count ?? s.rejectedCount ?? s.needsCorrectionCount ?? 0);
        const totalSubs = Number(s.total_submissions ?? s.totalSubmissions ?? (approvedCount + pendingCount + rejectedCount));
        const progressPercent = Number(s.progress_percent ?? s.progressPercent ?? Math.min(100, Math.round((approvedCount / 180) * 100)));
        const teacherMatch = s.assigned_teacher_id ? fsTeachers.find((t) => t.id === s.assigned_teacher_id) : null;

        return {
          ...s,
          id: s.id,
          full_name: s.full_name || 'Student',
          email: s.email || '',
          whatsapp: s.whatsapp || '',
          role: 'student',
          status: s.status || 'active',
          learning_level: s.learning_level || 'Book 1',
          assigned_teacher_id: s.assigned_teacher_id ?? null,
          registered_by_id: s.registered_by_id ?? null,
          assigned_teacher_name: s.assigned_teacher_name || teacherMatch?.full_name || null,
          created_at: s.created_at || s.lastActive || new Date().toISOString(),
          approved_count: approvedCount,
          pending_count: pendingCount,
          rejected_count: rejectedCount,
          total_submissions: totalSubs,
          progress_percent: progressPercent,
          attendance_days: Number(s.attendance_days ?? 0),
          attendance_hours: String(s.attendance_hours ?? '0.0'),
          is_checked_in: Boolean(s.is_checked_in),
        };
      };

      for (const s of serverStudents) {
        if (!s || s.id === 'student') continue;
        const key = normalizeGmailClient(s.email || s.id || '');
        if (key) studentMap.set(key, toSnakeStudent(s));
      }

      for (const fs of fsStudents) {
        if (!fs || fs.id === 'student') continue;
        const key = normalizeGmailClient(fs.email || fs.id || '');
        if (!key) continue;

        const studentSubs = fsSubmissions.filter((sub) =>
          isSubmissionForStudent(sub, fs.id, fs.email || key)
        );
        const approvedCount = studentSubs.filter((s) => s.status === 'approved').length;
        const pendingCount = studentSubs.filter((s) => s.status === 'submitted').length;
        const rejectedCount = studentSubs.filter((s) => s.status === 'needs_correction' || s.status === 'rejected').length;
        const lastActive = studentSubs[0]?.updated_at || studentSubs[0]?.submitted_at || fs.created_at;

        if (studentMap.has(key)) {
          const existing = studentMap.get(key);
          const mergedApproved = Math.max(existing.approved_count || 0, approvedCount);
          const mergedPending = Math.max(existing.pending_count || 0, pendingCount);
          const mergedRejected = Math.max(existing.rejected_count || 0, rejectedCount);
          const mergedTotal = Math.max(existing.total_submissions || 0, studentSubs.length);

          studentMap.set(key, toSnakeStudent({
            ...existing,
            full_name: fs.full_name && fs.full_name !== 'Student' ? fs.full_name : existing.full_name,
            whatsapp: fs.whatsapp || existing.whatsapp,
            status: fs.status || existing.status,
            assigned_teacher_id: existing.assigned_teacher_id ?? fs.assigned_teacher_id ?? null,
            registered_by_id: existing.registered_by_id ?? fs.registered_by_id ?? null,
            created_at: existing.created_at || fs.created_at,
            approved_count: mergedApproved,
            pending_count: mergedPending,
            rejected_count: mergedRejected,
            total_submissions: mergedTotal,
            progress_percent: Math.max(existing.progress_percent || 0, Math.min(100, Math.round((mergedApproved / 180) * 100))),
            last_active: lastActive || existing.last_active,
          }));
        } else {
          studentMap.set(key, toSnakeStudent({
            id: fs.id,
            full_name: fs.full_name || 'Student',
            email: fs.email,
            whatsapp: fs.whatsapp || '',
            role: 'student',
            status: fs.status || 'active',
            learning_level: fs.learning_level || 'Book 1',
            assigned_teacher_id: fs.assigned_teacher_id ?? null,
            registered_by_id: fs.registered_by_id ?? null,
            created_at: fs.created_at || lastActive || new Date().toISOString(),
            approved_count: approvedCount,
            pending_count: pendingCount,
            rejected_count: rejectedCount,
            total_submissions: studentSubs.length,
            progress_percent: Math.min(100, Math.round((approvedCount / 180) * 100)),
          }));
        }
      }

      let result = Array.from(studentMap.values());
      if (currentUser?.role === 'teacher') {
        result = result.filter(
          (s) => s.assigned_teacher_id === currentUser.id || s.registered_by_id === currentUser.id
        );
      }
      return result;
    };

    return syncRequest(
      async () => {
        const res = await serverRequest<{ students: any[]; totalCurriculumTasks: number }>('/users/students-overview');
        return {
          students: mergeStudents(res?.students || []),
          totalCurriculumTasks: res?.totalCurriculumTasks || 180,
        };
      },
      async () => {
        const local = await storageService.getStudentsOverview();
        return {
          students: mergeStudents(local?.students || []),
          totalCurriculumTasks: 180,
        };
      }
    );
  },

  syncWithServer: async (): Promise<any> => {
    try {
      const payload = storageService.getAllForSync();
      const res = await serverRequest<{ success: boolean; admissions: any[]; users: any[] }>('/sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res?.admissions) storageService.mergeAdmissions(res.admissions);
      if (res?.users) storageService.mergeUsers(res.users);
      return res;
    } catch (err) {
      console.warn('Sync with server skipped:', err);
      return null;
    }
  },

  getTeachersList: async (): Promise<any> => {
    let fsTeachers: any[] = [];
    try {
      const all = await firestoreService.getAllUsers();
      fsTeachers = all.filter((u) => ['teacher', 'owner', 'admin'].includes(u.role) && u.status === 'active');
    } catch {}

    return syncRequest(
      async () => {
        const res = await serverRequest<{ teachers: any[] }>('/users/teachers');
        const map = new Map<string, any>();
        for (const t of res?.teachers || []) map.set(t.id, t);
        for (const ft of fsTeachers) {
          if (!map.has(ft.id)) map.set(ft.id, ft);
        }
        return { teachers: Array.from(map.values()) };
      },
      () => storageService.getTeachersList()
    );
  },

  updateUser: async (id: string, data: any): Promise<any> => {
    let extraHash: { password_hash?: string; salt?: string } = {};
    if (data.password && String(data.password).trim().length >= 6) {
      const { salt, hash } = await hashPasswordWeb(String(data.password).trim());
      extraHash = { password_hash: hash, salt };
    }

    return syncRequest(
      async () => {
        const res = await serverRequest(`/users/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        try {
          const allFs = await firestoreService.getAllUsers();
          const existing = allFs.find((u) => u.id === id);
          if (existing) {
            await firestoreService.saveUser({
              ...existing,
              ...data,
              ...extraHash,
            });
          }
        } catch {}
        return res;
      },
      async () => {
        const res = await storageService.updateUser(id, data);
        return res;
      }
    );
  },

  getAuditLogs: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/users/audit-logs'),
      () => storageService.getAuditLogs()
    );
  },

  // Batches
  getBatches: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/batches'),
      () => storageService.getBatches()
    );
  },

  enrollBatch: async (id: string): Promise<any> => {
    return syncRequest(
      () => serverRequest(`/batches/${encodeURIComponent(id)}/enroll`, { method: 'POST' }),
      () => storageService.enrollBatch(id)
    );
  },

  createBatch: async (data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest('/batches', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => storageService.createBatch(data)
    );
  },

  // Feedback
  submitFeedback: async (data: { category: string; rating: number; comment: string }): Promise<any> => {
    return syncRequest(
      () => serverRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => storageService.submitFeedback(data)
    );
  },

  getFeedbacks: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/feedback'),
      () => storageService.getFeedbacks()
    );
  },

  respondFeedback: async (id: string, response: string): Promise<any> => {
    return syncRequest(
      () => serverRequest(`/feedback/${encodeURIComponent(id)}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response }),
      }),
      () => storageService.respondFeedback(id, response)
    );
  },

  // Scoreboard
  getScoreboard: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/scoreboard'),
      () => storageService.getScoreboard()
    );
  },

  // Settings
  getSettings: async (): Promise<AcademySettings> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<{ settings: AcademySettings }>('/settings');
        return (res as any)?.settings || (res as any);
      },
      () => storageService.getSettings()
    );
  },

  updateSettings: async (data: Partial<AcademySettings>): Promise<any> => {
    return syncRequest(
      () => serverRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      () => storageService.updateSettings(data)
    );
  },

  getAdminStats: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/settings/admin-stats'),
      () => storageService.getAdminStats()
    );
  },

  // Backup & Restore
  exportDatabase: () => storageService.exportDatabase(),
  importDatabase: (jsonStr: string) => storageService.importDatabase(jsonStr),
};

export { getKarachiTimeString, getKarachiDateKey };
export default api;
