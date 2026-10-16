import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Video,
  Clock,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import type { BatchItem } from '../types';

interface BatchesPageProps {
  filterOnlyEnrolled?: boolean;
}

export const BatchesPage: React.FC<BatchesPageProps> = ({ filterOnlyEnrolled = false }) => {
  const { user, isAdmin } = useAuth();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [maxStudents, setMaxStudents] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.getBatches();
      setBatches(res.batches);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleEnroll = async (batchId: string) => {
    try {
      const res = await api.enrollBatch(batchId);
      alert(res.message);
      await fetchBatches();
    } catch (err: any) {
      alert(err.message || 'Enrollment failed');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !schedule.trim()) return;

    setSubmitting(true);
    try {
      await api.createBatch({
        title: title.trim(),
        description: description.trim() || undefined,
        teacher_name: teacherName.trim() || undefined,
        schedule: schedule.trim(),
        zoom_link: zoomLink.trim() || undefined,
        max_students: Number(maxStudents),
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setTeacherName('');
      setSchedule('');
      setZoomLink('');
      await fetchBatches();
    } catch (err: any) {
      alert(err.message || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const displayedBatches = filterOnlyEnrolled
    ? batches.filter((b) => b.is_enrolled)
    : batches;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            <span>
              {filterOnlyEnrolled ? 'My Batch Enrollments' : 'Learn with a Teacher — Live Batches'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Join cohort classes for live Zoom sessions, daily guidance on tasks, and English speaking practice.
          </p>
        </div>

        {isAdmin && !filterOnlyEnrolled && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        )}
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Loading learning batches...
        </div>
      ) : displayedBatches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          {filterOnlyEnrolled
            ? 'You have not enrolled in any learning batches yet. Browse All Batches to enroll!'
            : 'No active learning batches found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {batch.title}
                  </h3>
                  {batch.is_enrolled && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Enrolled
                    </span>
                  )}
                </div>

                {batch.teacher_name && (
                  <p className="text-xs font-semibold text-teal-700 mt-1">
                    Facilitator: {batch.teacher_name}
                  </p>
                )}

                {batch.description && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {batch.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">{batch.schedule}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Enrolled Students:{' '}
                      <strong className="text-slate-800">
                        {batch.enrolled_count} / {batch.max_students}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {batch.zoom_link ? (
                  <a
                    href={batch.zoom_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>Join Live Zoom</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Meeting link provided to enrolled students
                  </span>
                )}

                {batch.is_enrolled ? (
                  <span className="text-xs font-bold text-emerald-700">
                    Active Member ✓
                  </span>
                ) : (
                  <button
                    disabled={(batch.enrolled_count ?? 0) >= batch.max_students}
                    onClick={() => handleEnroll(batch.id)}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  >
                    {(batch.enrolled_count ?? 0) >= batch.max_students ? 'Batch Full' : 'Enroll in Batch'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Owner / Admin: Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-slate-800">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Create Group Learning Batch</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Batch Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Foundation Level 1 - Evening Cohort"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teacher Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sir Farukh"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Schedule (Days & Times) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mon-Fri: 5:00 PM - 6:30 PM PKT"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Zoom / Meeting URL
                </label>
                <input
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Class objectives, topics covered..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchesPage;
