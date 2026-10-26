import { storageService, getKarachiTimeString, getKarachiDateKey } from './storage';
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
    // If it's an infrastructure failure (405, 404, 500+, non-JSON, network error), fall back immediately to local store
    if (err?.isInfraError || !err?.status || err.status === 405 || err.status === 404 || err.status >= 500) {
      console.warn('Backend server returned infrastructure status, using client fallback:', err?.message || err);
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
    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.token) setStoredToken(res.token);
        if (res.user) {
          storageService.saveUserLocally(res.user, data.password);
        }
        return res;
      },
      () => storageService.login(data)
    );
  },

  googleLogin: async (data: { email: string; full_name?: string }): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/auth/google-login', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.token) setStoredToken(res.token);
        if (res.user) {
          storageService.saveUserLocally(res.user, 'google-oauth-session');
        }
        return res;
      },
      () => storageService.googleLogin(data)
    );
  },

  getMe: async (): Promise<{ user: UserProfile }> => {
    return syncRequest(
      () => serverRequest<{ user: UserProfile }>('/auth/me'),
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
    const qs = new URLSearchParams();
    if (params?.book && params.book !== 'all') qs.set('book', params.book);
    if (params?.day !== undefined) qs.set('day', String(params.day));
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    if (params?.student_id) qs.set('student_id', params.student_id);

    const queryStr = qs.toString() ? `?${qs.toString()}` : '';

    return syncRequest(
      () => serverRequest<{ tasks: TaskItem[] }>(`/tasks${queryStr}`),
      () => storageService.getTasks(params)
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
    return syncRequest(
      () => serverRequest<SubmissionSummary>(`/submissions/summary/me?book=${encodeURIComponent(book)}`),
      () => storageService.getSummaryMe(book)
    );
  },

  submitTask: async (data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest('/submissions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => storageService.submitTask(data)
    );
  },

  getReviewQueue: async (params?: { status?: string; book?: string; search?: string; student_id?: string }): Promise<any> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.book) qs.set('book', params.book);
    if (params?.search) qs.set('search', params.search);
    if (params?.student_id) qs.set('student_id', params.student_id);

    const queryStr = qs.toString() ? `?${qs.toString()}` : '';

    return syncRequest(
      () => serverRequest(`/submissions/queue${queryStr}`),
      () => storageService.getReviewQueue(params)
    );
  },

  reviewSubmission: async (id: string, data: { decision: string; feedback?: string }): Promise<any> => {
    // Normalize decision string if 'approve' was passed instead of 'approved'
    const normalizedDecision = data.decision === 'approve' ? 'approved' : data.decision;
    return syncRequest(
      () => serverRequest(`/submissions/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          decision: normalizedDecision,
        }),
      }),
      () => storageService.reviewSubmission(id, data)
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
    return syncRequest(
      () => serverRequest('/attendance/check-in', { method: 'POST' }),
      () => storageService.checkIn()
    );
  },

  checkOut: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest('/attendance/check-out', { method: 'POST' }),
      () => storageService.checkOut()
    );
  },

  getAttendanceHistory: async (studentId?: string): Promise<any> => {
    const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
    return syncRequest(
      () => serverRequest(`/attendance/history${qs}`),
      () => storageService.getAttendanceHistory(studentId)
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
      () => serverRequest(`/admissions/teachers/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => storageService.approveTeacherApplication(id, data)
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
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);

    const queryStr = qs.toString() ? `?${qs.toString()}` : '';
    return syncRequest(
      async () => {
        const res = await serverRequest<{ users: any[] }>(`/users${queryStr}`);
        if (res?.users) {
          storageService.mergeUsers(res.users);
        }
        const local = await storageService.getUsers(params);
        const serverList = res?.users || [];
        const map = new Map(serverList.map((u: any) => [u.id, u]));
        for (const lu of (local?.users || [])) {
          if (!map.has(lu.id)) {
            map.set(lu.id, lu);
          } else if (lu.status === 'active' && map.get(lu.id).status !== 'active') {
            map.set(lu.id, { ...map.get(lu.id), status: 'active' });
          }
        }
        return { users: Array.from(map.values()) };
      },
      () => storageService.getUsers(params)
    );
  },

  registerStudentByOwner: async (data: { full_name: string; whatsapp: string; email: string; learning_level?: string }): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/users/register-student', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.student) {
          storageService.saveUserLocally(res.student, 'google-oauth-session');
        }
        return res;
      },
      () => storageService.registerStudentByOwner(data)
    );
  },

  registerTeacherByOwner: async (data: { full_name: string; email: string; whatsapp?: string; subjects?: string; password?: string; can_approve?: boolean }): Promise<any> => {
    return syncRequest(
      async () => {
        const res = await serverRequest<any>('/users/register-teacher', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.teacher) {
          storageService.saveUserLocally(res.teacher, res.temporaryPassword || 'teacher@accl2026');
        }
        return res;
      },
      () => storageService.registerTeacherByOwner(data)
    );
  },

  clearDummyStudents: async (): Promise<any> => {
    return syncRequest(
      () => serverRequest<any>('/users/clear-dummy-students', { method: 'POST' }),
      () => storageService.clearDummyStudents()
    );
  },

  getStudentsOverview: async (): Promise<{ students: any[]; totalCurriculumTasks: number }> => {
    return syncRequest(
      () => serverRequest<{ students: any[]; totalCurriculumTasks: number }>('/users/students-overview'),
      () => storageService.getStudentsOverview()
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
    return syncRequest(
      () => serverRequest('/users/teachers'),
      () => storageService.getTeachersList()
    );
  },

  updateUser: async (id: string, data: any): Promise<any> => {
    return syncRequest(
      () => serverRequest(`/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      () => storageService.updateUser(id, data)
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
