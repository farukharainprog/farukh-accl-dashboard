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

export const api = {
  // Auth
  checkOwnerExists: () => storageService.checkOwnerExists(),
  firstOwnerSetup: (data: any) => storageService.firstOwnerSetup(data),
  register: (data: any) => storageService.register(data),
  login: (data: any) => storageService.login(data),
  getMe: () => storageService.getMe(),
  updateProfile: (data: any) => storageService.updateProfile(data),

  // Tasks
  getTasks: (params?: { book?: string; day?: number; category?: string; search?: string; status?: string; student_id?: string }) =>
    storageService.getTasks(params),
  loadDefaultTasks: () => storageService.loadDefaultTasks(),
  getTaskStats: () => storageService.getTaskStats(),
  createTask: (data: any) => storageService.createTask(data),
  updateTask: (id: string, data: any) => storageService.updateTask(id, data),
  archiveTask: (id: string) => storageService.archiveTask(id),

  // Submissions
  getSummaryMe: (book?: string) => storageService.getSummaryMe(book),
  submitTask: (data: any) => storageService.submitTask(data),
  getReviewQueue: (params?: { status?: string; book?: string; search?: string; student_id?: string }) =>
    storageService.getReviewQueue(params),
  reviewSubmission: (id: string, data: { decision: string; feedback?: string }) =>
    storageService.reviewSubmission(id, data),
  getTaskHistory: (taskId: string, studentId?: string) => storageService.getTaskHistory(taskId, studentId),

  // Attendance
  getAttendanceStatus: () => storageService.getAttendanceStatus(),
  checkIn: () => storageService.checkIn(),
  checkOut: () => storageService.checkOut(),
  getAttendanceHistory: (studentId?: string) => storageService.getAttendanceHistory(studentId),

  // Admissions
  submitStudentAdmission: (data: any) => storageService.submitStudentAdmission(data),
  submitTeacherApplication: (data: any) => storageService.submitTeacherApplication(data),
  getStudentAdmissions: () => storageService.getStudentAdmissions(),
  approveStudentAdmission: (id: string) => storageService.approveStudentAdmission(id),
  rejectStudentAdmission: (id: string) => storageService.rejectStudentAdmission(id),
  getTeacherApplications: () => storageService.getTeacherApplications(),
  approveTeacherApplication: (id: string, data: any) => storageService.approveTeacherApplication(id, data),
  rejectTeacherApplication: (id: string) => storageService.rejectTeacherApplication(id),

  // Users Management
  getUsers: (params?: { role?: string; status?: string; search?: string }) => storageService.getUsers(params),
  getTeachersList: () => storageService.getTeachersList(),
  updateUser: (id: string, data: any) => storageService.updateUser(id, data),
  getAuditLogs: () => storageService.getAuditLogs(),

  // Batches
  getBatches: () => storageService.getBatches(),
  enrollBatch: (id: string) => storageService.enrollBatch(id),
  createBatch: (data: any) => storageService.createBatch(data),

  // Feedback
  submitFeedback: (data: { category: string; rating: number; comment: string }) =>
    storageService.submitFeedback(data),
  getFeedbacks: () => storageService.getFeedbacks(),
  respondFeedback: (id: string, response: string) => storageService.respondFeedback(id, response),

  // Scoreboard
  getScoreboard: () => storageService.getScoreboard(),

  // Settings
  getSettings: () => storageService.getSettings(),
  updateSettings: (data: Partial<AcademySettings>) => storageService.updateSettings(data),
  getAdminStats: () => storageService.getAdminStats(),

  // Backup & Restore
  exportDatabase: () => storageService.exportDatabase(),
  importDatabase: (jsonStr: string) => storageService.importDatabase(jsonStr),
};

export { getKarachiTimeString, getKarachiDateKey };
export default api;
