import React, { useState, useEffect } from 'react';
import {
  Trophy,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  MessageCircle,
  AlertCircle,
  Calendar,
  Timer,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import type { SubmissionSummary, AttendanceStatus } from '../types';
import confetti from 'canvas-confetti';

interface RightSidebarProps {
  summary: SubmissionSummary | null;
  selectedLevel: string;
  selectedDay: string;
  availableDays: number[];
  onLevelChange: (level: string) => void;
  onDayChange: (day: string) => void;
  onGoToTasks: () => void;
  onRefreshSummary: () => void;
  onNavigateToHistory: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  summary,
  selectedLevel,
  selectedDay,
  availableDays,
  onLevelChange,
  onDayChange,
  onGoToTasks,
  onRefreshSummary,
  onNavigateToHistory,
}) => {
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [attLoading, setAttLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTimePKT, setCurrentTimePKT] = useState<string>('');

  // Fetch Attendance status
  const fetchAttendance = async () => {
    try {
      const res = await api.getAttendanceStatus();
      setAttendance(res);
      if (res.activeSession) {
        const startTime = new Date(res.activeSession.check_in_time).getTime();
        const diffSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setElapsedSeconds(diffSec);
      } else {
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  // Ticking timer for checked-in student and clock
  useEffect(() => {
    const timer = setInterval(() => {
      // Clock in Asia/Karachi
      try {
        const now = new Date();
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now);
        setCurrentTimePKT(str + ' PKT');
      } catch {
        // fallback
      }

      if (attendance?.isCheckedIn) {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attendance?.isCheckedIn]);

  const [attNotice, setAttNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCheckIn = async () => {
    setAttLoading(true);
    setAttNotice(null);
    try {
      const res = await api.checkIn();
      setAttNotice({ type: 'success', text: res.message || 'Checked in successfully!' });
      await fetchAttendance();
      setTimeout(() => setAttNotice(null), 5000);
    } catch (err: any) {
      setAttNotice({ type: 'error', text: err.message || 'Check In failed' });
    } finally {
      setAttLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setAttLoading(true);
    setAttNotice(null);
    try {
      const res = await api.checkOut();
      setAttNotice({ type: 'success', text: res.message || 'Checked out successfully!' });
      await fetchAttendance();
      onRefreshSummary();
      setTimeout(() => setAttNotice(null), 5000);
    } catch (err: any) {
      setAttNotice({ type: 'error', text: err.message || 'Check Out failed' });
    } finally {
      setAttLoading(false);
    }
  };

  // Celebration if all completed
  const isCompleted = Boolean(
    summary && summary.totalTasks > 0 && summary.approvedCount >= summary.totalTasks
  );

  useEffect(() => {
    if (isCompleted) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [isCompleted]);

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? `${h}h ` : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const approvedTasks = summary?.approvedCount || 0;
  const totalTasks = summary?.totalTasks || 0;
  const progressPercent = summary?.progressPercent || 0;

  return (
    <div className="w-full lg:w-80 flex flex-col gap-4">
      {/* Congratulations Card if completed or near completion */}
      {isCompleted ? (
        <div className="bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200 border-2 border-amber-500 rounded-xl p-5 shadow-md text-amber-950">
          <div className="flex items-center gap-2 font-black text-lg">
            <Sparkles className="w-6 h-6 text-amber-800" />
            <span>Congratulations! 🎉</span>
          </div>
          <p className="text-xs font-semibold mt-2 leading-relaxed text-amber-900">
            You've completed all Foundation Level Book 1 tasks! Time to get your certificate! 🌟
          </p>
        </div>
      ) : (
        /* Large Metric Progress Header */
        <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-xs text-center">
          <div className="text-4xl sm:text-5xl font-black text-blue-700 tracking-tight">
            {approvedTasks}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
            Foundation Level 1 Tasks Completed
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium mt-1.5">
            <span>Progress: {progressPercent}%</span>
            <span>Total: {totalTasks} Required</span>
          </div>
        </div>
      )}

      {/* Book Level Info Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span>Book 1 - Foundation Level Book 1 Tasks</span>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          You are currently working on Book 1 (Foundation Level Book 1) tasks.
        </p>
      </div>

      {/* Select Tasks / Navigation Filter Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-3">
          Select Tasks
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Select Level *
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => onLevelChange(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Book 1">Book 1 (Foundation Level)</option>
              <option value="Book 2">Book 2 (Advanced Level)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Select Day *
            </label>
            <select
              value={selectedDay}
              onChange={(e) => onDayChange(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Days (Day 1 - 180)</option>
              {availableDays.map((d) => (
                <option key={d} value={String(d)}>
                  Day {d}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onGoToTasks}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>Go to Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* REAL-TIME ATTENDANCE WIDGET */}
      <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Attendance
            </h3>
          </div>
          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">
            {currentTimePKT || 'Karachi Time'}
          </span>
        </div>

        {/* Live Status indicator */}
        <div className="my-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                attendance?.isCheckedIn
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {attendance?.isCheckedIn ? 'Checked In (Present)' : 'Checked Out'}
            </span>
          </div>

          {attendance?.isCheckedIn && (
            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              {formatElapsed(elapsedSeconds)}
            </span>
          )}
        </div>

        {/* Attendance Action Feedback Alert */}
        {attNotice && (
          <div
            className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
              attNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-red-50 text-red-900 border border-red-300'
            }`}
          >
            <span>{attNotice.text}</span>
            <button
              onClick={() => setAttNotice(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Check In & Check Out Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={attLoading || attendance?.isCheckedIn}
            onClick={handleCheckIn}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              attendance?.isCheckedIn
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Check In</span>
          </button>

          <button
            disabled={attLoading || !attendance?.isCheckedIn}
            onClick={handleCheckOut}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              !attendance?.isCheckedIn
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-xs cursor-pointer'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Check Out</span>
          </button>
        </div>

        {/* Monthly Attendance Stats */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-100 text-center">
          <div className="p-1.5 bg-slate-50 rounded">
            <span className="block text-xs font-black text-slate-800">
              {attendance?.monthlyStats?.daysPresent || 0}
            </span>
            <span className="block text-[10px] text-slate-500 font-medium">Days Present</span>
          </div>
          <div className="p-1.5 bg-slate-50 rounded">
            <span className="block text-xs font-black text-slate-800">
              {attendance?.monthlyStats?.completedSessions || 0}
            </span>
            <span className="block text-[10px] text-slate-500 font-medium">Sessions</span>
          </div>
          <div className="p-1.5 bg-slate-50 rounded">
            <span className="block text-xs font-black text-slate-800">
              {attendance?.monthlyStats?.totalHours || '0.0'}h
            </span>
            <span className="block text-[10px] text-slate-500 font-medium">Hours</span>
          </div>
        </div>

        {/* View Monthly Log Link */}
        <button
          onClick={onNavigateToHistory}
          className="w-full mt-2 text-center text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1"
        >
          <span>View Detailed Attendance Log</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        <p className="text-[10px] text-slate-400 italic text-center mt-2 leading-tight">
          {attendance?.disclaimer || 'App-recorded attendance, not proof of physical presence.'}
        </p>
      </div>

      {/* Official WhatsApp Contacts Widget */}
      <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>Academy WhatsApp Support</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          For admission verification, task queries, or fee support:
        </p>

        <div className="flex flex-col gap-2">
          <a
            href="https://wa.me/923453967083"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold border border-emerald-200 transition-colors"
          >
            <span>WhatsApp 1: 0345 3967083</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
          </a>

          <a
            href="https://wa.me/923421336388"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold border border-emerald-200 transition-colors"
          >
            <span>WhatsApp 2: 03421336388</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
          </a>
        </div>
      </div>
    </div>
  );
};
