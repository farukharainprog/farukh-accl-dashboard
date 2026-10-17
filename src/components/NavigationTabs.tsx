import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  MessageSquare,
  Users,
  CalendarCheck,
  Share2,
  ListFilter,
  ShieldCheck,
  UserPlus,
  ClipboardList,
} from 'lucide-react';
import type { SubmissionSummary } from '../types';

export type NavTab =
  | 'owner_dashboard'
  | 'all_tasks'
  | 'book_1'
  | 'book_2'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'scoreboard'
  | 'submit_feedback'
  | 'feedback_scoreboard'
  | 'attendance'
  | 'social_links'
  | 'batches'
  | 'my_enrollments'
  | 'my_teacher'
  | 'review_queue'
  | 'user_management'
  | 'admissions_management'
  | 'admin_settings';

interface NavigationTabsProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  summary?: SubmissionSummary | null;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  summary,
}) => {
  const { user, isOwner, isAdmin, isTeacher } = useAuth();

  const isSelected = (tab: NavTab) => activeTab === tab;

  const btnClass = (tab: NavTab, activeColor = 'bg-blue-600 text-white shadow-sm font-bold') =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
      isSelected(tab)
        ? activeColor
        : 'text-slate-700 hover:text-blue-800 hover:bg-blue-50/80 bg-white border border-slate-200'
    }`;

  return (
    <div className="w-full bg-slate-100/80 border-b border-slate-200 py-2 px-4 sm:px-8 overflow-x-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max">
        {/* Owner Dashboard Primary Tab */}
        {(isOwner || isAdmin) && (
          <button
            onClick={() => onTabChange('owner_dashboard')}
            className={btnClass('owner_dashboard', 'bg-indigo-900 text-amber-300 font-bold shadow-md')}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Owner Dashboard</span>
          </button>
        )}

        {/* All Tasks */}
        <button onClick={() => onTabChange('all_tasks')} className={btnClass('all_tasks')}>
          <ListFilter className="w-3.5 h-3.5" />
          <span>All Tasks</span>
        </button>

        {/* Book 1 */}
        <button onClick={() => onTabChange('book_1')} className={btnClass('book_1')}>
          <BookOpen className="w-3.5 h-3.5" />
          <span>Book 1</span>
        </button>

        {/* Book 2 */}
        <button onClick={() => onTabChange('book_2')} className={btnClass('book_2')}>
          <BookOpen className="w-3.5 h-3.5" />
          <span>Book 2</span>
        </button>

        {/* Pending */}
        <button
          onClick={() => onTabChange('pending')}
          className={btnClass('pending', 'bg-amber-500 text-slate-900 shadow-sm font-bold')}
        >
          <Clock className="w-3.5 h-3.5 text-slate-900" />
          <span>Pending</span>
          {summary?.pendingCount !== undefined && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold ml-0.5">
              {summary.pendingCount}
            </span>
          )}
        </button>

        {/* Approved */}
        <button
          onClick={() => onTabChange('approved')}
          className={btnClass('approved', 'bg-emerald-600 text-white shadow-sm font-bold')}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          <span>Approved</span>
          {summary?.approvedCount !== undefined && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-800 text-emerald-100 font-bold ml-0.5">
              {summary.approvedCount}
            </span>
          )}
        </button>

        {/* Rejected / Needs Correction */}
        <button
          onClick={() => onTabChange('rejected')}
          className={btnClass('rejected', 'bg-red-600 text-white shadow-sm font-bold')}
        >
          <AlertCircle className="w-3.5 h-3.5 text-white" />
          <span>Rejected / Needs Correction</span>
          {summary?.needsCorrectionCount !== undefined && summary.needsCorrectionCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-800 text-red-100 font-bold ml-0.5">
              {summary.needsCorrectionCount}
            </span>
          )}
        </button>

        {/* Scoreboard */}
        <button onClick={() => onTabChange('scoreboard')} className={btnClass('scoreboard')}>
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Scoreboard</span>
        </button>

        {/* Attendance */}
        <button onClick={() => onTabChange('attendance')} className={btnClass('attendance')}>
          <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Attendance</span>
        </button>

        {/* Submit Feedback */}
        <button onClick={() => onTabChange('submit_feedback')} className={btnClass('submit_feedback')}>
          <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
          <span>Submit Feedback</span>
        </button>

        {/* Feedback Scoreboard */}
        <button onClick={() => onTabChange('feedback_scoreboard')} className={btnClass('feedback_scoreboard')}>
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
          <span>Feedback Scoreboard</span>
        </button>

        {/* Social Links */}
        <button onClick={() => onTabChange('social_links')} className={btnClass('social_links')}>
          <Share2 className="w-3.5 h-3.5 text-sky-600" />
          <span>Social Links</span>
        </button>

        {/* Group Learning (Batches) */}
        <button onClick={() => onTabChange('batches')} className={btnClass('batches')}>
          <Users className="w-3.5 h-3.5 text-teal-600" />
          <span>Group Learning (Batches)</span>
        </button>

        {/* My Batch Enrollments */}
        <button onClick={() => onTabChange('my_enrollments')} className={btnClass('my_enrollments')}>
          <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
          <span>My Batch Enrollments</span>
        </button>

        {/* Student Teacher Info */}
        {user?.role === 'student' && user.assigned_teacher_name && (
          <button onClick={() => onTabChange('my_teacher')} className={btnClass('my_teacher')}>
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>My Teacher ({user.assigned_teacher_name})</span>
          </button>
        )}

        {/* Review Queue (for Teacher, Admin, Owner) */}
        {isTeacher && (
          <button
            onClick={() => onTabChange('review_queue')}
            className={btnClass('review_queue', 'bg-indigo-700 text-white font-bold')}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Review Queue</span>
          </button>
        )}

        {/* Admissions Management */}
        {(isTeacher || isAdmin) && (
          <button
            onClick={() => onTabChange('admissions_management')}
            className={btnClass('admissions_management', 'bg-teal-700 text-white font-bold')}
          >
            <UserPlus className="w-3.5 h-3.5 text-teal-200" />
            <span>Admissions</span>
          </button>
        )}

        {/* Owner / Admin Management Tabs */}
        {isAdmin && (
          <button
            onClick={() => onTabChange('user_management')}
            className={btnClass('user_management', 'bg-slate-800 text-white font-bold')}
          >
            <Users className="w-3.5 h-3.5 text-blue-300" />
            <span>Users & Roles</span>
          </button>
        )}

        {isOwner && (
          <button
            onClick={() => onTabChange('admin_settings')}
            className={btnClass('admin_settings', 'bg-slate-900 text-amber-300 font-bold')}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academy Settings</span>
          </button>
        )}
      </div>
    </div>
  );
};
