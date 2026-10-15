import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Facebook,
  Youtube,
  Linkedin,
  Instagram,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';

interface ReviewModalProps {
  submission: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  submission,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState(submission.reviewer_feedback || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isTeacher = user?.role === 'teacher';
  const canApprove = user?.role === 'owner' || user?.role === 'admin' || Boolean(user?.can_approve);

  const handleReview = async (decision: 'approved' | 'needs_correction' | 'rejected') => {
    setErrorMsg('');

    if (decision !== 'approved' && !feedback.trim()) {
      setErrorMsg('Please enter feedback explaining what the student needs to correct.');
      return;
    }

    if (decision === 'approved' && isTeacher && !canApprove) {
      setErrorMsg('Your teacher account does not have approval permission. You can request corrections or leave feedback.');
      return;
    }

    setSubmitting(true);
    try {
      await api.reviewSubmission(submission.id, {
        decision,
        feedback: feedback.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 block">
              Review Submission • Version {submission.version}
            </span>
            <h2 className="text-lg font-bold">
              Day {submission.task_day}: {submission.task_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{submission.student_name}</h4>
              <p className="text-xs text-slate-500">{submission.student_email}</p>
            </div>
          </div>

          {/* Submitted Links */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Submitted Student Proofs:
            </label>
            <div className="space-y-2">
              {submission.fb_link && (
                <a
                  href={submission.fb_link.startsWith('http') ? submission.fb_link : `https://${submission.fb_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 hover:bg-blue-100"
                >
                  <span className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    <span>Facebook: {submission.fb_link}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {submission.yt_link && (
                <a
                  href={submission.yt_link.startsWith('http') ? submission.yt_link : `https://${submission.yt_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800 hover:bg-red-100"
                >
                  <span className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" />
                    <span>YouTube: {submission.yt_link}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {submission.li_link && (
                <a
                  href={submission.li_link.startsWith('http') ? submission.li_link : `https://${submission.li_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  <span className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-sky-600" />
                    <span>LinkedIn: {submission.li_link}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {submission.insta_link && (
                <a
                  href={submission.insta_link.startsWith('http') ? submission.insta_link : `https://${submission.insta_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-pink-50 border border-pink-200 text-xs font-medium text-pink-800 hover:bg-pink-100"
                >
                  <span className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    <span>Instagram: {submission.insta_link}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {submission.other_link && (
                <a
                  href={submission.other_link.startsWith('http') ? submission.other_link : `https://${submission.other_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>Other: {submission.other_link}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {submission.file_url && (
                <a
                  href={submission.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>File: {submission.file_name || 'Download / View File'}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Student Notes / Code */}
          {submission.student_notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                Student Notes / Reflection:
              </span>
              <p className="font-mono whitespace-pre-line">{submission.student_notes}</p>
            </div>
          )}

          {/* Teacher Permission Disclaimer */}
          {isTeacher && !canApprove && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Note: Your account can request corrections and give feedback. Final approval is reserved for the Academy Owner.
              </span>
            </div>
          )}

          {/* Reviewer Feedback Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Reviewer Feedback / Instructions to Student
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 'Great work, approved!' or 'Please provide a valid public Facebook post link and tag 10 mutual friends.'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full text-xs p-3 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* Review Decisions Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100">
            {canApprove && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleReview('approved')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Task</span>
              </button>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleReview('needs_correction')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 shadow-xs disabled:opacity-50 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Needs Correction</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleReview('rejected')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Submission</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
