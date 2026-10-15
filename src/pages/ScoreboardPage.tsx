import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trophy, Medal, Award, Star, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import type { LeaderboardEntry } from '../types';

export const ScoreboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getScoreboard()
      .then((res) => setLeaderboard(res.leaderboard))
      .catch((err) => console.error('Failed to load scoreboard:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-2xl p-6 sm:p-8 text-slate-900 shadow-md">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-950">
            <Sparkles className="w-4 h-4 text-amber-800" />
            <span>Official Academy Hall of Fame</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            Student Achievement Scoreboard
          </h2>
          <p className="text-xs sm:text-sm font-medium text-amber-950/80 mt-2 leading-relaxed">
            Scores are strictly computed from verified completed tasks (10 points each) and completed attendance study sessions (5 points each).
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Academy Rankings</span>
          </h3>
          <span className="text-xs text-slate-400">
            {leaderboard.length} Ranked Students
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4 text-center">Approved Tasks (10 pts)</th>
                <th className="py-3 px-4 text-center">Attendance Sessions (5 pts)</th>
                <th className="py-3 px-4 text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Calculating scores...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active student task records found yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((student) => {
                  const isTop1 = student.rank === 1;
                  const isTop2 = student.rank === 2;
                  const isTop3 = student.rank === 3;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        student.isCurrentStudent ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            🥇 1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                            🥈 2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{student.rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {student.isCurrentStudent && (
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {student.learning_level}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {student.approvedTasks}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          <Clock className="w-3.5 h-3.5" />
                          {student.attendanceSessions}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-sm text-amber-600 font-mono">
                          {student.totalPoints} pts
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
    </div>
  );
};
