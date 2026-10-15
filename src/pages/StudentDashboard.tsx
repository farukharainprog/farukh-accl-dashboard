import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from '../components/TaskCard';
import { RightSidebar } from '../components/RightSidebar';
import { SubmitTaskModal } from '../components/SubmitTaskModal';
import { ReviewModal } from '../components/ReviewModal';
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
  const { user, isTeacher, isOwner } = useAuth();

  const [selectedBook, setSelectedBook] = useState<string>(initialBook);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [activeTaskForSubmit, setActiveTaskForSubmit] = useState<TaskItem | null>(null);
  const [activeSubmissionForReview, setActiveSubmissionForReview] = useState<any | null>(null);

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

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.slice(0, 6).map((c) => (
            <button
              key={c.category}
              onClick={() => setSelectedCategory(c.category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

            <button
              onClick={fetchDashboardData}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Book 2 Placeholder if empty */}
          {selectedBook === 'Book 2' && filteredTasks.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-10 text-center text-slate-600 space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Welcome to Foundation Level Book 2
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Book 2 tasks are currently being scheduled and reviewed by the academy leadership. No fabricated tasks have been added. As soon as the Owner imports Book 2 challenges, they will appear here.
              </p>
              {isOwner && (
                <p className="text-xs font-semibold text-blue-700 bg-blue-50 inline-block px-3 py-1 rounded-lg">
                  Owner note: You can create new Book 2 tasks from the Tasks Management panel.
                </p>
              )}
            </div>
          )}

          {/* Tasks Grid */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Loading curriculum tasks...
            </div>
          ) : filteredTasks.length === 0 && selectedBook !== 'Book 2' ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              No tasks found matching your filter criteria.
            </div>
          ) : (
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
          onLevelChange={setSelectedBook}
          onDayChange={setSelectedDay}
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
          onSuccess={fetchDashboardData}
        />
      )}

      {/* Review Modal */}
      {activeSubmissionForReview && (
        <ReviewModal
          submission={activeSubmissionForReview}
          onClose={() => setActiveSubmissionForReview(null)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
