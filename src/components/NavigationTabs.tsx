import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  CalendarCheck,
  ListFilter,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
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
  const [globalPendingSubCount, setGlobalPendingSubCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (!isOwner && !isAdmin && !isTeacher) return;
    const fetchPendingCount = async () => {
      try {
        const res = await api.getReviewQueue({ status: 'submitted' });
        setGlobalPendingSubCount(res.submissions?.length || 0);
      } catch (err) {
        // silent
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 2500);
    return () => clearInterval(interval);
  }, [isOwner, isAdmin, isTeacher]);

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
            {globalPendingSubCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                {globalPendingSubCount} New
              </span>
            )}
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

        {/* Attendance */}
        <button onClick={() => onTabChange('attendance')} className={btnClass('attendance')}>
          <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Attendance</span>
        </button>

        {/* Student Teacher Info */}
        {user?.role === 'student' && user.assigned_teacher_name && (
          <button onClick={() => onTabChange('my_teacher')} className={btnClass('my_teacher')}>
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>My Teacher ({user.assigned_teacher_name})</span>
          </button>
        )}

        {/* Review Queue (for Teacher, Admin, Owner) */}
        {(isTeacher || isOwner || isAdmin) && (
          <button
            onClick={() => onTabChange('review_queue')}
            className={btnClass('review_queue', 'bg-indigo-700 text-white font-bold')}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Review Queue</span>
            {globalPendingSubCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                {globalPendingSubCount}
              </span>
            )}
          </button>
        )}

        {/* Owner / Admin Management Tabs */}
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
