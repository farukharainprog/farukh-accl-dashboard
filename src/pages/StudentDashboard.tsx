import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from '../components/TaskCard';
import { RightSidebar } from '../components/RightSidebar';
import { SubmitTaskModal } from '../components/SubmitTaskModal';
import { ReviewModal } from '../components/ReviewModal';
import { AddTaskModal } from '../components/AddTaskModal';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  Sparkles,
  Layers,
  RefreshCw,
  Plus,
  PlusCircle,
  DownloadCloud,
  Trophy,
  Award,
  GraduationCap,
  TrendingUp,
  User,
} from 'lucide-react';
import type { TaskItem, SubmissionSummary } from '../types';

interface StudentDashboardProps {
  initialBook?: string;
  statusFilterTab?: string;
  onNavigateToHistory: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  initialBook = 'Book 1',
  statusFilterTab,
  onNavigateToHistory,
}) => {
  const { user, isTeacher, isOwner, isAdmin } = useAuth();

  const [selectedBook, setSelectedBook] = useState<string>(initialBook);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDefaults, setLoadingDefaults] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Modals
  const [activeTaskForSubmit, setActiveTaskForSubmit] = useState<TaskItem | null>(null);
  const [activeSubmissionForReview, setActiveSubmissionForReview] = useState<any | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);

  const taskListRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Always load tasks first
      try {
        const tasksRes = await api.getTasks({
          book: selectedBook === 'all' ? undefined : selectedBook,
          day: selectedDay !== 'all' ? Number(selectedDay) : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined,
        });
        if (tasksRes?.tasks) {
          if (tasksRes.tasks.length === 0 && selectedBook !== 'Book 1' && selectedDay === 'all' && selectedCategory === 'all' && !searchQuery.trim()) {
            // Auto fallback to Book 1 if currently selected book has no tasks
            const b1Res = await api.getTasks({ book: 'Book 1' });
            if (b1Res?.tasks && b1Res.tasks.length > 0) {
              setTasks(b1Res.tasks);
              setSelectedBook('Book 1');
            } else {
              setTasks([]);
            }
          } else {
            setTasks(tasksRes.tasks);
          }
        }
      } catch (errTasks) {
        console.error('Error fetching tasks:', errTasks);
      }

      // 2. Fetch stats
      try {
        const statsRes = await api.getTaskStats();
        if (statsRes) {
          setAvailableDays(statsRes.days || []);
          setCategories(statsRes.categories || []);
        }
      } catch (errStats) {
        console.warn('Error fetching stats:', errStats);
      }

      // 3. Fetch summary for student
      try {
        const summaryRes = await api.getSummaryMe(selectedBook === 'all' ? 'Book 1' : selectedBook);
        if (summaryRes) {
          setSummary(summaryRes);
        }
      } catch (errSum) {
        console.warn('Error fetching summary:', errSum);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Real-time synchronization: poll every 4 seconds to sync approval/rejection statuses in real time
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedBook, selectedDay, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleGoToTasks = () => {
    fetchDashboardData();
    if (taskListRef.current) {
      taskListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLoadDefaultTasks = async () => {
    setLoadingDefaults(true);
    setActionSuccessMsg('');
    try {
      const res = await api.loadDefaultTasks();
      await fetchDashboardData();
      setActionSuccessMsg(res.message || 'Default tasks loaded successfully!');
      setTimeout(() => setActionSuccessMsg(''), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to load default tasks');
    } finally {
      setLoadingDefaults(false);
    }
  };

  // Keep selectedBook synced when initialBook prop changes (e.g. from NavigationTabs)
  useEffect(() => {
    if (initialBook) {
      setSelectedBook(initialBook);
    }
  }, [initialBook]);

  const [localStatusFilter, setLocalStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>(
    (statusFilterTab as any) || 'all'
  );

  useEffect(() => {
    if (statusFilterTab) {
      setLocalStatusFilter(statusFilterTab as any);
    }
  }, [statusFilterTab]);

  // Filter tasks based on localStatusFilter (pending, approved, rejected, all)
  const filteredTasks = useMemo(() => {
    if (localStatusFilter === 'all') return tasks;

    return tasks.filter((t) => {
      const sub = t.submission;
      if (localStatusFilter === 'pending') return sub?.status === 'submitted';
      if (localStatusFilter === 'approved') return sub?.status === 'approved';
      if (localStatusFilter === 'rejected') return sub?.status === 'needs_correction' || sub?.status === 'rejected';
      return true;
    });
  }, [tasks, localStatusFilter]);

  const approvedCount = summary?.approvedCount || 0;
  const pendingCount = summary?.pendingCount || 0;
  const needsCorrectionCount = summary?.needsCorrectionCount || 0;
  const totalTasksCount = summary?.totalTasks || 180;
  const totalSubmissions = approvedCount + pendingCount + needsCorrectionCount;
  const progressPercent = summary?.progressPercent || 0;

  const badges = [
    { id: 'enrolled', title: 'Portal Scholar', desc: 'Google Account Active', icon: GraduationCap, unlocked: true },
    { id: 'first_sub', title: 'First Submission', desc: '1+ Task Submitted', icon: Sparkles, unlocked: totalSubmissions >= 1 },
    { id: 'rising_star', title: 'Rising Achiever', desc: '5+ Tasks Approved', icon: Award, unlocked: approvedCount >= 5 },
    { id: 'social_star', title: 'Social Media Star', desc: '15+ Tasks Approved', icon: Trophy, unlocked: approvedCount >= 15 },
    { id: 'champion', title: 'Curriculum Master', desc: '50+ Tasks Approved', icon: CheckCircle2, unlocked: approvedCount >= 50 },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-950 text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Student Achievement & Progress Hub */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                Student Achievement Hub
              </span>
              <span className="text-xs text-slate-400">&bull; {selectedBook}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Welcome back, {user?.full_name || 'Student'}!
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>{user?.email}</span>
              <span aria-hidden="true">&bull;</span>
              <span className="text-emerald-700 font-semibold">Active Student Account</span>
              <span aria-hidden="true">&bull;</span>
              <span className="font-mono tabular-nums">{progressPercent}% Completed</span>
            </div>
          </div>

          {/* Overall Progress Percentage Circle/Bar Indicator */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Progress</span>
              <span className="text-xl font-black text-blue-700 font-mono tabular-nums">
                {approvedCount} / {totalTasksCount}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-r-slate-200 flex items-center justify-center font-black text-xs text-blue-900 font-mono">
              {progressPercent}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="py-4">
          <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
            <span>Curriculum Completion ({selectedBook})</span>
            <span className="font-mono font-bold text-blue-700">{approvedCount} of {totalTasksCount} Approved Tasks ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 4 Status Metric Counters & Quick Filter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 pb-4">
          <button
            onClick={() => setLocalStatusFilter('approved')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              localStatusFilter === 'approved'
                ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Approved Tasks</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-1 font-mono tabular-nums">{approvedCount}</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Verified by Owner</p>
          </button>

          <button
            onClick={() => setLocalStatusFilter('pending')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              localStatusFilter === 'pending'
                ? 'bg-amber-50 border-amber-400 shadow-xs'
                : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Tasks</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-950 mt-1 font-mono tabular-nums">{pendingCount}</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Awaiting Owner Approval</p>
          </button>

          <button
            onClick={() => setLocalStatusFilter('rejected')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              localStatusFilter === 'rejected'
                ? 'bg-red-50 border-red-400 shadow-xs'
                : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Needs Correction</span>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-black text-red-950 mt-1 font-mono tabular-nums">{needsCorrectionCount}</p>
            <p className="text-[10px] text-red-700 mt-0.5">Click to view & fix</p>
          </button>

          <button
            onClick={() => setLocalStatusFilter('all')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              localStatusFilter === 'all'
                ? 'bg-blue-50 border-blue-400 shadow-xs'
                : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">All Curriculum</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono tabular-nums">{totalTasksCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Day 1 to Day 180</p>
          </button>
        </div>

        {/* Achievement Badges Showcase */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Earned Badges & Milestones
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    b.unlocked
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      b.unlocked ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-snug">{b.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Owner / Admin Management Banner */}
      {(isOwner || isAdmin) && (
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wide">
                Owner Controls
              </span>
              <h3 className="text-sm font-bold text-white">Curriculum & Database Task Manager</h3>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed">
              Ensure all 220+ Day 1 to 180 Foundation Tasks are synced or add customized curriculum tasks for your students.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleLoadDefaultTasks}
              disabled={loadingDefaults}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <DownloadCloud className={`w-4 h-4 ${loadingDefaults ? 'animate-bounce' : ''}`} />
              <span>{loadingDefaults ? 'Syncing...' : 'Load Default Tasks (Day 1 - 180)'}</span>
            </button>

            <button
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Task</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search task title, day or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
        </form>

        {/* Book Selector & Day Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex rounded-lg border bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => {
                setSelectedBook('Book 1');
                setSelectedDay('all');
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedBook === 'Book 1' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Book 1 (Foundation)
            </button>
            <button
              onClick={() => {
                setSelectedBook('Book 2');
                setSelectedDay('all');
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedBook === 'Book 2' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Book 2 (Advanced)
            </button>
            <button
              onClick={() => {
                setSelectedBook('all');
                setSelectedDay('all');
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedBook === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Books
            </button>
          </div>

          {/* Day Filter */}
          {selectedBook === 'Book 1' && availableDays.length > 0 && (
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-xs py-1.5 px-3 border rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Days (1 - 180)</option>
              {availableDays.map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters */}
          {(selectedDay !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDay('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:underline px-2 py-1 font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Topics:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Topics
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              onClick={() => setSelectedCategory(c.category)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === c.category
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Left Column (Tasks) + Right Column (Summary & Attendance) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start" ref={taskListRef}>
        {/* Left Column: Tasks List */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h2 className="text-base font-bold text-slate-900">
                {selectedBook} Tasks {statusFilterTab ? `(${statusFilterTab.toUpperCase()})` : ''}
              </h2>
              <span className="text-xs text-slate-400 font-semibold">
                ({filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'})
              </span>
            </div>

            <div className="flex items-center gap-3">
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              )}
              <button
                onClick={() => fetchDashboardData(false)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Empty State: Differentiate empty filter vs truly empty DB */}
          {!loading && filteredTasks.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-8 text-center text-slate-600 space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <BookOpen className="w-7 h-7" />
              </div>

              {tasks.length > 0 ? (
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    No tasks found matching filter: <span className="capitalize text-blue-600">"{localStatusFilter}"</span>
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
                    You have <strong className="text-slate-800">{tasks.length} tasks</strong> assigned in {selectedBook}.
                    {localStatusFilter === 'approved' && ' You have not had any tasks approved in this filter yet.'}
                    {localStatusFilter === 'pending' && ' You have no tasks waiting in the review queue.'}
                    {localStatusFilter === 'rejected' && ' None of your tasks currently need correction.'}
                  </p>
                  <div className="pt-3">
                    <button
                      onClick={() => {
                        setLocalStatusFilter('all');
                        setSelectedDay('all');
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      View All Assigned Tasks ({tasks.length} Tasks)
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedBook === 'Book 2' ? 'Book 2 Tasks' : 'Curriculum Tasks Not Loaded Yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
                    {selectedBook === 'Book 2'
                      ? 'No tasks have been added for Book 2 yet. You can create new Book 2 challenges below.'
                      : 'The database currently has 0 tasks loaded for this view. Click below to load all 220+ original Rehan School Foundation tasks.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                    <button
                      onClick={handleLoadDefaultTasks}
                      disabled={loadingDefaults}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <DownloadCloud className={`w-4 h-4 ${loadingDefaults ? 'animate-bounce' : ''}`} />
                      <span>{loadingDefaults ? 'Loading Tasks...' : 'Load All 220+ Default Foundation Tasks'}</span>
                    </button>
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => setShowAddTaskModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Create Custom Task</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading curriculum tasks...
            </div>
          )}

          {/* Tasks Grid */}
          {!loading && filteredTasks.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onSubmitClick={(t) => setActiveTaskForSubmit(t)}
                  onReviewClick={(t) => {
                    if (t.submission) {
                      setActiveSubmissionForReview({
                        ...t.submission,
                        student_name: user?.full_name,
                        student_email: user?.email,
                        task_day: t.day_number,
                        task_title: t.title,
                      });
                    }
                  }}
                  isReviewer={isTeacher}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Summary Panel, Attendance Widget & Level Selector */}
        <RightSidebar
          summary={summary}
          selectedLevel={selectedBook}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onLevelChange={(level: string) => {
            setSelectedBook(level);
            setSelectedDay('all');
          }}
          onDayChange={(day: string) => setSelectedDay(day)}
          onGoToTasks={handleGoToTasks}
          onRefreshSummary={fetchDashboardData}
          onNavigateToHistory={onNavigateToHistory}
        />
      </div>

      {/* Task Submission Modal */}
      {activeTaskForSubmit && (
        <SubmitTaskModal
          task={activeTaskForSubmit}
          onClose={() => setActiveTaskForSubmit(null)}
          onSuccess={(subData?: any) => {
            const taskId = activeTaskForSubmit.id;
            // Optimistically update the task state immediately to 'submitted' (Pending Task)
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id === taskId) {
                  return {
                    ...t,
                    submission: {
                      ...(t.submission || {}),
                      ...(subData || {}),
                      status: 'submitted',
                      task_id: taskId,
                      user_id: user?.id || 0,
                      version: ((t.submission?.version || 0) + 1),
                    } as any,
                  };
                }
                return t;
              })
            );
            setActiveTaskForSubmit(null);
            setActionSuccessMsg('Task submitted successfully! Status is now "Pending Task" awaiting Owner Approval.');
            // Refetch fresh data from server in background
            fetchDashboardData(true);
          }}
        />
      )}

      {/* Review Modal for Teachers / Owners */}
      {activeSubmissionForReview && (
        <ReviewModal
          submission={activeSubmissionForReview}
          onClose={() => setActiveSubmissionForReview(null)}
          onSuccess={() => {
            fetchDashboardData();
            setActiveSubmissionForReview(null);
            setActionSuccessMsg('Submission reviewed successfully!');
          }}
        />
      )}

      {/* Add Task Modal for Owner / Admin */}
      {showAddTaskModal && (
        <AddTaskModal
          initialBook={selectedBook}
          onClose={() => setShowAddTaskModal(false)}
          onTaskAdded={() => {
            fetchDashboardData();
            setActionSuccessMsg('New task added successfully to the database!');
          }}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
