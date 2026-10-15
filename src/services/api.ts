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

const TOKEN_KEY = 'accl_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  checkOwnerExists: () => request<{ hasOwner: boolean }>('/api/auth/check-owner-exists'),
  firstOwnerSetup: (data: any) => request<{ message: string; token: string; user: UserProfile }>('/api/auth/first-owner-setup', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<{ message: string; token: string; user: UserProfile; requiresActivation: boolean }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request<{ message: string; token: string; user: UserProfile; isPending: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<{ user: UserProfile }>('/api/auth/me'),
  updateProfile: (data: any) => request<{ message: string; user: UserProfile }>('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Tasks
  getTasks: (params: { book?: string; day?: number; category?: string; search?: string; status?: string; student_id?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.book) q.set('book', params.book);
    if (params.day) q.set('day', String(params.day));
    if (params.category) q.set('category', params.category);
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.student_id) q.set('student_id', params.student_id);
    return request<{ tasks: TaskItem[] }>(`/api/tasks?${q.toString()}`);
  },
  getTaskStats: () => request<{ totalTasks: number; book1Tasks: number; book2Tasks: number; categories: { category: string; count: number }[]; days: number[]; flaggedTasks: any[] }>('/api/tasks/meta/stats'),
  createTask: (data: any) => request<{ message: string; taskId: string }>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => request<{ message: string }>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveTask: (id: string) => request<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Submissions
  getSummaryMe: (book?: string) => request<SubmissionSummary>(`/api/submissions/summary/me${book ? `?book=${encodeURIComponent(book)}` : ''}`),
  submitTask: (data: any) => request<{ message: string; submissionId: string; version: number; status: string }>('/api/submissions', { method: 'POST', body: JSON.stringify(data) }),
  getReviewQueue: (params: { status?: string; book?: string; search?: string; student_id?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.book) q.set('book', params.book);
    if (params.search) q.set('search', params.search);
    if (params.student_id) q.set('student_id', params.student_id);
    return request<{ submissions: any[] }>(`/api/submissions/queue?${q.toString()}`);
  },
  reviewSubmission: (id: string, data: { decision: string; feedback?: string }) => request<{ message: string; decision: string }>(`/api/submissions/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  getTaskHistory: (taskId: string, studentId?: string) => request<{ history: any[] }>(`/api/submissions/${taskId}/history${studentId ? `?student_id=${studentId}` : ''}`),

  // Attendance
  getAttendanceStatus: () => request<AttendanceStatus>('/api/attendance/status'),
  checkIn: () => request<{ message: string; session: any }>('/api/attendance/check-in', { method: 'POST' }),
  checkOut: () => request<{ message: string; session: any }>('/api/attendance/check-out', { method: 'POST' }),
  getAttendanceHistory: (studentId?: string) => request<{ history: any[] }>(`/api/attendance/history${studentId ? `?student_id=${studentId}` : ''}`),

  // Admissions
  submitStudentAdmission: (data: any) => request<{ message: string; admissionId: string }>('/api/admissions/student', { method: 'POST', body: JSON.stringify(data) }),
  submitTeacherApplication: (data: any) => request<{ message: string; applicationId: string }>('/api/admissions/teacher', { method: 'POST', body: JSON.stringify(data) }),
  getStudentAdmissions: () => request<{ admissions: any[] }>('/api/admissions/students'),
  approveStudentAdmission: (id: string) => request<{ message: string }>(`/api/admissions/students/${id}/approve`, { method: 'POST' }),
  rejectStudentAdmission: (id: string) => request<{ message: string }>(`/api/admissions/students/${id}/reject`, { method: 'POST' }),
  getTeacherApplications: () => request<{ applications: any[] }>('/api/admissions/teachers'),
  approveTeacherApplication: (id: string, data: any) => request<{ message: string; temporaryPassword?: string }>(`/api/admissions/teachers/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  rejectTeacherApplication: (id: string) => request<{ message: string }>(`/api/admissions/teachers/${id}/reject`, { method: 'POST' }),

  // Users Management
  getUsers: (params: { role?: string; status?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.role) q.set('role', params.role);
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    return request<{ users: UserProfile[] }>(`/api/users?${q.toString()}`);
  },
  getTeachersList: () => request<{ teachers: any[] }>('/api/users/teachers-list'),
  updateUser: (id: string, data: any) => request<{ message: string }>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAuditLogs: () => request<{ logs: any[] }>('/api/users/audit-logs'),

  // Batches
  getBatches: () => request<{ batches: BatchItem[] }>('/api/batches'),
  enrollBatch: (id: string) => request<{ message: string }>(`/api/batches/${id}/enroll`, { method: 'POST' }),
  createBatch: (data: any) => request<{ message: string; batchId: string }>('/api/batches', { method: 'POST', body: JSON.stringify(data) }),

  // Feedback
  submitFeedback: (data: { category: string; rating: number; comment: string }) => request<{ message: string; feedbackId: string }>('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getFeedbacks: () => request<{ feedbacks: FeedbackItem[]; stats: { total: number; averageRating: number } }>('/api/feedback'),
  respondFeedback: (id: string, response: string) => request<{ message: string }>(`/api/feedback/${id}/respond`, { method: 'POST', body: JSON.stringify({ response }) }),

  // Scoreboard
  getScoreboard: () => request<{ leaderboard: LeaderboardEntry[] }>('/api/scoreboard'),

  // Settings
  getSettings: () => request<AcademySettings>('/api/settings'),
  updateSettings: (data: Partial<AcademySettings>) => request<{ message: string }>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getAdminStats: () => request<any>('/api/settings/admin-stats'),
};

export default api;
