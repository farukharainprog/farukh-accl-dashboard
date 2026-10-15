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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes, summaryRes] = await Promise.all([
        api.getTasks({
          book: selectedBook,
          day: selectedDay !== 'all' ? Number(selectedDay) : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.getTaskStats(),
        api.getSummaryMe(selectedBook),
      ]);

      setTasks(tasksRes.tasks);
      setAvailableDays(statsRes.days);
      setCategories(statsRes.categories);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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

  // Filter tasks based on statusFilterTab if passed from NavigationTabs (pending, approved, rejected)
  const filteredTasks = useMemo(() => {
    if (!statusFilterTab || statusFilterTab === 'all') return tasks;

    return tasks.filter((t) => {
      const sub = t.submission;
      if (statusFilterTab === 'pending') return sub?.status === 'submitted';
      if (statusFilterTab === 'approved') return sub?.status === 'approved';
      if (statusFilterTab === 'rejected') return sub?.status === 'needs_correction' || sub?.status === 'rejected';
      return true;
    });
  }, [tasks, statusFilterTab]);

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
                onClick={fetchDashboardData}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Empty State with Owner Load Tasks Button */}
          {!loading && filteredTasks.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-10 text-center text-slate-600 space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedBook === 'Book 2' ? 'Book 2 Tasks' : 'Curriculum Tasks Not Loaded Yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
                  {selectedBook === 'Book 2'
                    ? 'No tasks have been added for Book 2 yet. You can create new Book 2 challenges below.'
                    : 'The database currently has 0 tasks loaded for this view. Click below to instantly load all 220+ original Rehan School Foundation tasks.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleLoadDefaultTasks}
                  disabled={loadingDefaults}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  <DownloadCloud className={`w-4 h-4 ${loadingDefaults ? 'animate-bounce' : ''}`} />
                  <span>{loadingDefaults ? 'Loading Tasks...' : 'Load All 220+ Default Foundation Tasks'}</span>
                </button>

                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => setShowAddTaskModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Custom Task</span>
                  </button>
                )}
              </div>
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
          onSuccess={() => {
            fetchDashboardData();
            setActiveTaskForSubmit(null);
            setActionSuccessMsg('Task submitted successfully! It has been placed in the Review Queue.');
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
