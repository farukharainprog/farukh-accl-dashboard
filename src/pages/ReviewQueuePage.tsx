import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReviewModal } from '../components/ReviewModal';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [bookFilter, setBookFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.getReviewQueue({
        status: statusFilter || undefined,
        book: bookFilter || undefined,
        search: search.trim() || undefined,
      });
      setSubmissions(res.submissions);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, bookFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQueue();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Task Submissions Review Queue</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isTeacher && user?.role === 'teacher'
              ? 'Reviewing submissions from students assigned to your guidance.'
              : 'Owner & Admin master review queue for all academy student submissions.'}
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'submitted'
                ? 'bg-amber-500 text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Review
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Approved
          </button>

          <button
            onClick={() => setStatusFilter('needs_correction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'needs_correction'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Needs Correction
          </button>

          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === ''
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Submissions
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
          >
            Search
          </button>
        </form>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Loading submissions queue...
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No submissions found</h3>
          <p className="text-xs text-slate-400 mt-1">
            There are currently no tasks matching the selected filter in your review queue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900">
                    Day {sub.task_day}: {sub.task_title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sub.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'submitted'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {sub.status === 'submitted' ? 'Pending Review' : sub.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Version {sub.version}
                  </span>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-blue-700">{sub.student_name}</span>
                  <span className="text-slate-400">•</span>
                  <span>{sub.student_email}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-[11px] text-slate-400">
                    Submitted: {new Date(sub.updated_at).toLocaleString()}
                  </span>
                </div>

                {sub.student_notes && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded max-w-xl">
                    "{sub.student_notes}"
                  </p>
                )}

                {sub.reviewer_feedback && (
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100">
                    <strong>Reviewer Feedback:</strong> {sub.reviewer_feedback}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedSubmission(sub)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Review / Open</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedSubmission && (
        <ReviewModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSuccess={fetchQueue}
        />
      )}
    </div>
  );
};

export default ReviewQueuePage;
