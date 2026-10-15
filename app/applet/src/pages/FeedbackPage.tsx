import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Star,
  Send,
  MessageCircle,
  CheckCircle2,
  Reply,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { FeedbackItem } from '../types';

export const FeedbackPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState({ total: 0, averageRating: 5.0 });
  const [loading, setLoading] = useState(true);

  // Submit feedback form
  const [category, setCategory] = useState('Task Content & Instructions');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Admin reply modal/inline
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await api.getFeedbacks();
      setFeedbacks(res.feedbacks);
      setStats(res.stats);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.submitFeedback({
        category,
        rating,
        comment: comment.trim(),
      });
      setSuccessMsg(res.message);
      setComment('');
      await fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await api.respondFeedback(feedbackId, replyText.trim());
      setReplyId(null);
      setReplyText('');
      await fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            <span>Student Feedback & Community Scoreboard</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Share your experience, suggest course improvements, and read feedback from peers and academy leadership.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 p-3 rounded-xl self-start md:self-auto">
          <div className="flex items-center gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= Math.round(stats.averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300'
                }`}
              />
            ))}
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 leading-none">
              {stats.averageRating} / 5.0
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Based on {stats.total} student reviews
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Submit Feedback Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Submit Your Feedback</span>
          </h3>

          {successMsg && (
            <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="Task Content & Instructions">Task Content & Instructions</option>
                <option value="Call Annie Practice">Call Annie Practice</option>
                <option value="Interview & Live Streaming">Interview & Live Streaming</option>
                <option value="Coding Challenges">Coding Challenges</option>
                <option value="Teacher & Facilitator Support">Teacher & Facilitator Support</option>
                <option value="Dashboard Features & Suggestions">Dashboard Features & Suggestions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2 font-mono">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Your Review / Comment
              </label>
              <textarea
                rows={4}
                required
                placeholder="Share your thoughts, suggestions, or words of appreciation for your teacher..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full text-xs p-3 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Post Feedback'}</span>
            </button>
          </form>
        </div>

        {/* Right: Feedback Scoreboard List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Recent Academy Feedback ({feedbacks.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Loading reviews...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              No feedback entries yet. Be the first to share your thoughts!
            </div>
          ) : (
            feedbacks.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2 hover:border-purple-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{f.student_name}</span>
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {f.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {new Date(f.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed pt-1">
                  {f.comment}
                </p>

                {/* Academy Leadership Response */}
                {f.admin_response ? (
                  <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900">
                    <div className="font-bold text-blue-800 flex items-center gap-1.5 mb-0.5">
                      <Shield className="w-3.5 h-3.5 text-blue-700" />
                      <span>Academy Response:</span>
                    </div>
                    <p className="italic">{f.admin_response}</p>
                  </div>
                ) : (
                  isAdmin && (
                    <div className="pt-2">
                      {replyId === f.id ? (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <textarea
                            rows={2}
                            placeholder="Write academy response..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full text-xs p-2 border rounded bg-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setReplyId(null)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={replying}
                              onClick={() => handleReplySubmit(f.id)}
                              className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded disabled:opacity-50"
                            >
                              {replying ? 'Posting...' : 'Post Response'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReplyId(f.id);
                            setReplyText('');
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span>Reply to Feedback</span>
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
