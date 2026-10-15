import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck,
  Clock,
  Calendar,
  CheckCircle2,
  Timer,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const AttendanceHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAttendanceHistory()
      .then((res) => setHistory(res.history))
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalSessions = history.length;
  const totalMinutes = history.reduce((acc, h) => acc + (h.duration_minutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Group by date
  const distinctDays = new Set(history.map((h) => h.date_key)).size;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            <span>Attendance Log & Monthly Statistics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Recorded in Asia/Karachi timezone. Accurate server-verified check-in and check-out durations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center min-w-[90px]">
            <span className="block text-lg font-black text-blue-700 leading-none">
              {distinctDays}
            </span>
            <span className="text-[10px] text-blue-900 font-semibold">Days Present</span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[90px]">
            <span className="block text-lg font-black text-emerald-700 leading-none">
              {totalSessions}
            </span>
            <span className="text-[10px] text-emerald-900 font-semibold">Total Sessions</span>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center min-w-[90px]">
            <span className="block text-lg font-black text-purple-700 leading-none">
              {totalHours}h
            </span>
            <span className="text-[10px] text-purple-900 font-semibold">Total Hours</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Detailed Session History
          </h3>
          <span className="text-xs text-slate-400">
            Showing last 60 recorded sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Date (Asia/Karachi)</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Check-Out Time</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading attendance history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No attendance records found. Click "Check In" on your dashboard to start recording your study time.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{item.date_key}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.check_in_local}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {item.check_out_local || (
                        <span className="text-emerald-600 font-bold italic animate-pulse">
                          In Progress
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded font-mono font-bold text-slate-800 bg-slate-100">
                        {item.duration_minutes > 0 ? `${item.duration_minutes} min` : '< 1 min'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-500">
        📌 <strong>Important Notice:</strong> App-recorded attendance, not proof of physical presence. Used for curriculum progress and mentor evaluation.
      </div>
    </div>
  );
};
