import React, { useState } from 'react';
import type { TaskItem } from '../types';
import { api } from '../services/api';
import {
  X,
  UploadCloud,
  Facebook,
  Youtube,
  Linkedin,
  Instagram,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  Clock,
  History,
} from 'lucide-react';

interface SubmitTaskModalProps {
  task: TaskItem;
  onClose: () => void;
  onSuccess: (subData?: any) => void;
}

export const SubmitTaskModal: React.FC<SubmitTaskModalProps> = ({
  task,
  onClose,
  onSuccess,
}) => {
  const existingSub = task.submission;

  const [fbLink, setFbLink] = useState(existingSub?.fb_link || '');
  const [ytLink, setYtLink] = useState(existingSub?.yt_link || '');
  const [liLink, setLiLink] = useState(existingSub?.li_link || '');
  const [instaLink, setInstaLink] = useState(existingSub?.insta_link || '');
  const [otherLink, setOtherLink] = useState(existingSub?.other_link || '');
  const [fileUrl, setFileUrl] = useState(existingSub?.file_url || '');
  const [fileName, setFileName] = useState(existingSub?.file_name || '');
  const [notes, setNotes] = useState(existingSub?.student_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleFetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getTaskHistory(task.id);
      setHistoryList(res.history);
      setShowHistory(true);
    } catch {
      alert('Could not fetch history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const hasAnyLink = Boolean(
      fbLink.trim() || ytLink.trim() || liLink.trim() || instaLink.trim() || otherLink.trim()
    );
    const hasAnyFile = Boolean(fileUrl.trim());
    const hasAnyNotes = Boolean(notes.trim());

    if (!hasAnyLink && !hasAnyFile && !hasAnyNotes) {
      setErrorMsg('Please enter at least one valid proof link (Facebook, YouTube, LinkedIn, etc.) or write your explanation/notes.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        task_id: task.id,
        task_title: task.title,
        task_day: task.day_number,
        task_book: task.book,
        task_category: task.category,
        fb_link: fbLink.trim() || undefined,
        yt_link: ytLink.trim() || undefined,
        li_link: liLink.trim() || undefined,
        insta_link: instaLink.trim() || undefined,
        other_link: otherLink.trim() || undefined,
        file_url: fileUrl.trim() || undefined,
        file_name: fileName.trim() || undefined,
        student_notes: notes.trim() || undefined,
      };

      const res = await api.submitTask(payload);

      onSuccess({
        ...payload,
        submissionId: res?.submissionId,
        status: 'submitted',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please check your links.');
    } finally {
      setSubmitting(false);
    }
  };

  const isResubmission = Boolean(existingSub && existingSub.version >= 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="bg-[#0B3A79] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
              Day {task.day_number} • {task.category}
            </span>
            <h2 className="text-lg font-bold">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reviewer Feedback banner if needs correction */}
          {existingSub?.reviewer_feedback && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
              <div className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Reviewer Requested Changes:</span>
              </div>
              <p className="italic">{existingSub.reviewer_feedback}</p>
            </div>
          )}

          {/* Task Description summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="font-bold text-slate-800 block mb-1">Task Instructions:</span>
            <p className="whitespace-pre-line">{task.description}</p>
          </div>

          <div className="text-xs font-semibold text-slate-500 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
            💡 <strong className="text-blue-900">Submission Guideline:</strong> Providing at least ONE valid social proof link or code reflection is sufficient to submit for review.
          </div>

          {/* Social Proof Link Inputs */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Social Proof Links
            </label>

            {/* Facebook */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-200">
                <Facebook className="w-4 h-4 text-blue-600" />
              </div>
              <input
                type="text"
                placeholder="Facebook post URL (e.g. https://facebook.com/...)"
                value={fbLink}
                onChange={(e) => setFbLink(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* YouTube */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-200">
                <Youtube className="w-4 h-4 text-red-600" />
              </div>
              <input
                type="text"
                placeholder="YouTube video or Short URL"
                value={ytLink}
                onChange={(e) => setYtLink(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* LinkedIn */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 border border-sky-200">
                <Linkedin className="w-4 h-4 text-sky-600" />
              </div>
              <input
                type="text"
                placeholder="LinkedIn post or article URL"
                value={liLink}
                onChange={(e) => setLiLink(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Instagram */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center shrink-0 border border-pink-200">
                <Instagram className="w-4 h-4 text-pink-600" />
              </div>
              <input
                type="text"
                placeholder="Instagram post / reel link"
                value={instaLink}
                onChange={(e) => setInstaLink(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Other Link */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-300">
                <LinkIcon className="w-4 h-4 text-slate-600" />
              </div>
              <input
                type="text"
                placeholder="Other link / StreamYard / Google Drive link"
                value={otherLink}
                onChange={(e) => setOtherLink(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Student Notes / Code Reflection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Reflection / Notes / Code Explanation (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add your reflections, learnings, code snippet explanation, or notes for your facilitator..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-3 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>

          {/* File Link / Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              File Attachment URL / Screenshot Link (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="File name (e.g. calculator_screenshot.png)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                placeholder="Direct file or image URL"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Previous Revision History view toggle */}
          {isResubmission && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleFetchHistory}
                disabled={loadingHistory}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Previous Submission Versions & Feedback</span>
              </button>

              {showHistory && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                  {historyList.length === 0 ? (
                    <p className="text-xs text-slate-500">No prior history records found.</p>
                  ) : (
                    historyList.map((h) => (
                      <div key={h.id} className="text-xs p-2 bg-white rounded border border-slate-200">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Version {h.version} ({h.status})</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {h.reviewer_feedback && (
                          <p className="text-red-700 mt-1 italic">
                            Feedback: {h.reviewer_feedback}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {isResubmission ? `Submitting Version ${(existingSub?.version || 1) + 1}` : 'Initial Submission (Version 1)'}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : isResubmission ? 'Submit Correction' : 'Submit for Review'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
