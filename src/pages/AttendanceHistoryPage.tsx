import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck,
  Clock,
  Calendar,
  CheckCircle2,
  RefreshCw,
  User,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const AttendanceHistoryPage: React.FC = () => {
  const { user, isOwner, isAdmin } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getAttendanceHistory();
      const rawList = res?.history || res?.sessions || (Array.isArray(res) ? res : []);
      const safeList = Array.isArray(rawList) ? rawList : [];
      setHistory(safeList);
    } catch (err: any) {
      console.error('Failed to load attendance history:', err);
      setErrorMsg('Could not load attendance logs. Showing local data.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const safeHistory = Array.isArray(history) ? history : [];
  const totalSessions = safeHistory.length;
  const totalMinutes = safeHistory.reduce((acc, h) => {
    const mins = Number(h?.duration_minutes);
    return acc + (isNaN(mins) ? 0 : mins);
  }, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Group by distinct date
  const distinctDays = new Set(
    safeHistory.map((h) => {
      if (h?.date_key) return h.date_key;
      if (h?.check_in_time) {
        try {
          return new Date(h.check_in_time).toISOString().split('T')[0];
        } catch {
          return 'Today';
        }
      }
      return 'Today';
    })
  ).size;

  // Safe time formatter for Pakistan Standard Time
  const formatTime = (timeStr?: string, localStr?: string) => {
    if (localStr) return localStr;
    if (!timeStr) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date(timeStr)) + ' PKT';
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateKey?: string, timeStr?: string) => {
    if (dateKey) return dateKey;
    if (!timeStr) return 'Today';
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(timeStr));
    } catch {
      return 'Today';
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
              Attendance Records
            </span>
            {isOwner && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                Owner View
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-1">
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            <span>Attendance Log & Study Statistics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Student check-in & check-out logs recorded in Asia/Karachi (Pakistan Standard Time).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center min-w-[90px]">
            <span className="block text-xl font-black text-blue-700 leading-none">
              {distinctDays}
            </span>
            <span className="text-[10px] text-blue-900 font-semibold">Days Present</span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[90px]">
            <span className="block text-xl font-black text-emerald-700 leading-none">
              {totalSessions}
            </span>
            <span className="text-[10px] text-emerald-900 font-semibold">Sessions</span>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center min-w-[90px]">
            <span className="block text-xl font-black text-purple-700 leading-none">
              {totalHours}h
            </span>
            <span className="text-[10px] text-purple-900 font-semibold">Total Hours</span>
          </div>

          <button
            onClick={fetchHistory}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
            title="Refresh attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Detailed Session History
          </h3>
          <span className="text-xs text-slate-400">
            {safeHistory.length} {safeHistory.length === 1 ? 'record' : 'records'} logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Date (Asia/Karachi)</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Check-Out Time</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading attendance records...
                  </td>
                </tr>
              ) : safeHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-2">
                    <CalendarCheck className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-700">No attendance records logged yet.</p>
                    <p className="text-xs text-slate-400">
                      Click the "Check In" button on the dashboard to record your study session!
                    </p>
                  </td>
                </tr>
              ) : (
                safeHistory.map((item, idx) => {
                  const dateDisplay = formatDate(item?.date_key, item?.check_in_time);
                  const checkInDisplay = formatTime(item?.check_in_time, item?.check_in_local);
                  const isOngoing = item?.status === 'active' || item?.status === 'checked_in' || !item?.check_out_time;
                  const checkOutDisplay = isOngoing
                    ? 'In Progress (Active)'
                    : formatTime(item?.check_out_time, item?.check_out_local);
                  const durationMins = Number(item?.duration_minutes) || 0;

                  return (
                    <tr key={item?.id || `att_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{dateDisplay}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {item?.student_name || user?.full_name || 'Student'}
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {checkInDisplay}
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {isOngoing ? (
                          <span className="text-emerald-700 font-bold italic animate-pulse">
                            ● In Progress
                          </span>
                        ) : (
                          checkOutDisplay
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded font-mono font-bold text-slate-800 bg-slate-100">
                          {durationMins > 0 ? `${durationMins} min` : '< 1 min'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            !isOngoing
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {!isOngoing ? 'Completed' : 'Checked In'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 shadow-xs">
        📌 <strong>Attendance Policy:</strong> Recorded in Pakistan Standard Time (Asia/Karachi). Used for academy progress tracking and teacher evaluation.
      </div>
    </div>
  );
};

export default AttendanceHistoryPage;
