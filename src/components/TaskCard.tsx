import React from 'react';
import type { TaskItem } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Facebook,
  Youtube,
  Linkedin,
  Instagram,
  FileCode,
  FileText,
  UploadCloud,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface TaskCardProps {
  task: TaskItem;
  onSubmitClick: (task: TaskItem) => void;
  onReviewClick?: (task: TaskItem) => void;
  isReviewer?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onSubmitClick,
  onReviewClick,
  isReviewer,
}) => {
  const sub = task.submission;
  const status = sub?.status || 'not_started';

  const getStatusBadge = () => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Approved
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-400 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
            Pending Task
          </span>
        );
      case 'needs_correction':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 shadow-xs">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            Needs Correction
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Not Started
          </span>
        );
    }
  };

  const getCardBorderClass = () => {
    switch (status) {
      case 'approved':
        return 'border-emerald-300 bg-emerald-50/15 shadow-emerald-100/50';
      case 'submitted':
        return 'border-amber-300 bg-amber-50/20 shadow-amber-100/50';
      case 'needs_correction':
      case 'rejected':
        return 'border-red-300 bg-red-50/15 shadow-red-100/50';
      default:
        return 'border-slate-200 bg-white hover:border-slate-300';
    }
  };

  return (
    <div className={`rounded-xl border shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between ${getCardBorderClass()}`}>
      <div>
        {/* Card Header: Day and Title + Status */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            Day {task.day_number}: {task.title}
          </h3>
          <div className="shrink-0">{getStatusBadge()}</div>
        </div>

        {/* Source Flag Notice (e.g. Missing Day 15 or Repeated Day in source) */}
        {task.source_flag && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>{task.source_flag}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-normal whitespace-pre-line">
          <span className="font-semibold text-slate-700">Description: </span>
          {task.description}
        </p>

        {/* Reviewer Feedback Box (if any) */}
        {sub?.reviewer_feedback && (
          <div className="mt-3.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
            <span className="font-bold text-red-800 block mb-0.5">Reviewer Feedback:</span>
            <p className="italic">{sub.reviewer_feedback}</p>
          </div>
        )}

        {/* Submitted Proof Links (if student has submitted) */}
        {sub && (
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
              Submitted Proofs (Version {sub.version}):
            </span>
            <div className="flex flex-wrap gap-2">
              {sub.fb_link && (
                <a
                  href={sub.fb_link.startsWith('http') ? sub.fb_link : `https://${sub.fb_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span>Facebook Post</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {sub.yt_link && (
                <a
                  href={sub.yt_link.startsWith('http') ? sub.yt_link : `https://${sub.yt_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <Youtube className="w-3.5 h-3.5 text-red-600" />
                  <span>YouTube Content</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {sub.li_link && (
                <a
                  href={sub.li_link.startsWith('http') ? sub.li_link : `https://${sub.li_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5 text-sky-600" />
                  <span>LinkedIn Post</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {sub.insta_link && (
                <a
                  href={sub.insta_link.startsWith('http') ? sub.insta_link : `https://${sub.insta_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  <span>Instagram</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {sub.other_link && (
                <a
                  href={sub.other_link.startsWith('http') ? sub.other_link : `https://${sub.other_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Other Proof Link</span>
                </a>
              )}
              {sub.file_url && (
                <a
                  href={sub.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{sub.file_name || 'View File Proof'}</span>
                </a>
              )}
              {sub.student_notes && (
                <div className="w-full mt-1.5 p-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 font-mono">
                  <span className="font-bold text-slate-500 text-[10px] uppercase block">
                    Student Notes / Code:
                  </span>
                  {sub.student_notes}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Metadata badges + Submission Button */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Pills: Day, Category, Required Proof Types */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Day pill */}
          <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
            Day {task.day_number}
          </span>

          {/* Category pill */}
          <span className="inline-block px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-100">
            {task.category}
          </span>

          {/* Required Proof Types pill badges */}
          {(Array.isArray(task.required_links) ? task.required_links : []).map((linkType: string, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200"
            >
              {linkType.includes('Facebook') && <Facebook className="w-3 h-3 text-blue-600" />}
              {linkType.includes('YouTube') && <Youtube className="w-3 h-3 text-red-600" />}
              {linkType.includes('LinkedIn') && <Linkedin className="w-3 h-3 text-sky-600" />}
              {linkType.includes('View Submission') && <FileCode className="w-3 h-3 text-emerald-600" />}
              <span>{linkType}</span>
            </span>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {isReviewer && onReviewClick && (
            <button
              onClick={() => onReviewClick(task)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Review Task</span>
            </button>
          )}

          {status === 'not_started' && (
            <button
              onClick={() => onSubmitClick(task)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Submit Task</span>
            </button>
          )}

          {(status === 'needs_correction' || status === 'rejected') && (
            <button
              onClick={() => onSubmitClick(task)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Resubmit Correction</span>
            </button>
          )}

          {status === 'submitted' && (
            <button
              onClick={() => onSubmitClick(task)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-xs"
              title="Task is awaiting owner approval. Click to view or update links if needed."
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending Review (Edit Links)</span>
            </button>
          )}

          {status === 'approved' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Approved by Owner</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
