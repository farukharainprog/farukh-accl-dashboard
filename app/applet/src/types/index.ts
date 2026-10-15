export type UserRole = 'owner' | 'admin' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended';

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

export type TaskStatus = 'not_started' | 'submitted' | 'approved' | 'needs_correction' | 'rejected';

export interface TaskItem {
  id: string;
  book: string;
  day_number: number;
  title: string;
  description: string;
  category: string;
  required_links: string[];
  allows_text: boolean;
  allows_file: boolean;
  status: 'active' | 'archived' | 'flagged';
  source_flag?: string | null;
  order_index: number;
  created_at: string;
  submission?: {
    id: string;
    status: TaskStatus;
    version: number;
    fb_link?: string;
    yt_link?: string;
    li_link?: string;
    insta_link?: string;
    other_link?: string;
    file_url?: string;
    file_name?: string;
    student_notes?: string;
    reviewer_feedback?: string;
    reviewed_at?: string;
    submitted_at?: string;
  } | null;
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

export interface AttendanceStatus {
  isCheckedIn: boolean;
  activeSession: {
    id: string;
    student_id: string;
    check_in_time: string;
    check_in_local: string;
    status: 'active';
    date_key: string;
  } | null;
  serverCurrentTime: string;
  dateKey: string;
  todaySessions: {
    id: string;
    check_in_time: string;
    check_in_local: string;
    check_out_time?: string;
    check_out_local?: string;
    duration_minutes: number;
    status: string;
  }[];
  monthlyStats: {
    daysPresent: number;
    completedSessions: number;
    totalHours: string;
  };
  disclaimer: string;
}

export interface AcademySettings {
  dashboard_title: string;
  academy_name: string;
  footer_credit: string;
  whatsapp_primary: string;
  whatsapp_second: string;
  whatsapp_primary_link: string;
  whatsapp_second_link: string;
  academy_timezone: string;
  logo_url: string;
  require_student_approval: boolean;
  require_teacher_approval: boolean;
  currentTimePST: string;
}

export interface BatchItem {
  id: string;
  title: string;
  description?: string;
  teacher_id?: string;
  teacher_name?: string;
  schedule: string;
  zoom_link?: string;
  max_students: number;
  status: string;
  enrolled_count: number;
  is_enrolled: boolean;
}

export interface FeedbackItem {
  id: string;
  student_id: string;
  student_name: string;
  category: string;
  rating: number;
  comment: string;
  admin_response?: string;
  created_at: string;
  responded_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  learning_level: string;
  approvedTasks: number;
  attendanceSessions: number;
  totalPoints: number;
  isCurrentStudent: boolean;
}
