export type UserRole = 'owner' | 'admin' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  salt?: string;
  full_name: string;
  father_name?: string | null;
  whatsapp?: string | null;
  role: UserRole;
  status: UserStatus;
  learning_level: string; // 'Book 1' | 'Book 2'
  assigned_teacher_id?: string | null;
  can_approve: number | boolean;
  can_admit: number | boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  father_name?: string | null;
  whatsapp?: string | null;
  role: UserRole;
  status: UserStatus;
  learning_level: string;
  assigned_teacher_id?: string | null;
  assigned_teacher_name?: string | null;
  can_approve: boolean;
  can_admit: boolean;
  created_at: string;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'approved' | 'needs_correction' | 'rejected';

export interface TaskItem {
  id: string;
  book: string; // 'Book 1' | 'Book 2'
  day_number: number;
  title: string;
  description: string;
  category: string;
  required_links: string[] | string;
  allows_text: boolean | number;
  allows_file: boolean | number;
  status: 'active' | 'archived' | 'flagged';
  source_flag?: string | null;
  order_index: number;
  created_at: string;
  submission?: Submission | any | null;
}

export interface Submission {
  id: string;
  student_id?: string;
  task_id?: string;
  version: number;
  status: SubmissionStatus;
  fb_link?: string | null;
  yt_link?: string | null;
  li_link?: string | null;
  insta_link?: string | null;
  other_link?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  student_notes?: string | null;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  reviewer_feedback?: string | null;
  reviewed_at?: string | null;
  submitted_at: string;
  updated_at?: string;
  student_name?: string;
  student_email?: string;
  task_title?: string;
  task_day?: number;
  task_category?: string;
  task_book?: string;
}

export interface SubmissionSummary {
  book: string;
  totalTasks: number;
  approvedCount: number;
  pendingCount: number;
  needsCorrectionCount: number;
  remainingTasks: number;
  progressPercent: number;
}

export interface AttendanceSession {
  id: string;
  student_id?: string;
  check_in_time?: string;
  check_in_local?: string;
  check_out_time?: string | null;
  check_out_local?: string | null;
  duration_minutes?: number;
  status: 'active' | 'completed';
  date_key?: string;
  student_name?: string;
}

export interface AttendanceStatus {
  isCheckedIn?: boolean;
  activeSession?: AttendanceSession | any | null;
  todaySessions?: AttendanceSession[];
  todayCompletedCount?: number;
  todayTotalMinutes?: number;
  monthPresentDays?: number;
  monthTotalMinutes?: number;
  monthlyStats?: {
    presentDays?: number;
    daysPresent?: number;
    completedSessions?: number;
    totalMinutes?: number;
    totalHours?: string | number;
  };
  disclaimer?: string;
  todayKey?: string;
  dateKey?: string;
  currentTimeString?: string;
  serverCurrentTime?: string;
}

export interface AcademySettings {
  dashboard_title?: string;
  academy_name?: string;
  footer_credit?: string;
  whatsapp_primary?: string;
  whatsapp_second?: string;
  whatsapp_primary_link?: string;
  whatsapp_second_link?: string;
  logo_url?: string;
  require_student_approval?: boolean;
  require_teacher_approval?: boolean;
  currentTimePST?: string;
  academy_timezone?: string;
}

export interface TeacherApplication {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  subjects: string;
  introduction: string;
  experience?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface StudentAdmission {
  id: string;
  full_name: string;
  father_name: string;
  whatsapp: string;
  email: string;
  learning_level: string;
  assigned_teacher_id?: string | null;
  registered_by_id?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string | null;
  teacher_name?: string;
}

export interface BatchItem {
  id: string;
  title: string;
  description?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  schedule: string;
  zoom_link?: string | null;
  max_students: number;
  status: 'active' | 'completed' | 'archived';
  created_at?: string;
  enrolled_count?: number;
  is_enrolled?: boolean;
}

export type Batch = BatchItem;

export interface FeedbackItem {
  id: string;
  student_id: string;
  student_name: string;
  category: string;
  rating: number;
  comment: string;
  admin_response?: string | null;
  created_at: string;
  responded_at?: string | null;
}

export type StudentFeedback = FeedbackItem;

export interface LeaderboardEntry {
  id?: string;
  student_id?: string;
  name?: string;
  student_name?: string;
  learning_level: string;
  approvedTasks?: number;
  approved_tasks_count?: number;
  attendanceSessions?: number;
  completed_attendance_count?: number;
  totalPoints?: number;
  total_score?: number;
  rank: number;
  isCurrentStudent?: boolean;
  is_current_user?: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  details: string;
  timestamp: string;
}
