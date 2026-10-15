import { Router, type Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, type AuthRequest } from '../auth.js';

export const scoreboardRouter = Router();

scoreboardRouter.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;

    // Calculate scores per student: 10 pts per approved task + 5 pts per completed attendance session
    const rows = db.prepare(`
      SELECT u.id,
             u.full_name,
             u.learning_level,
             COALESCE(sub.approved_tasks, 0) as approved_tasks,
             COALESCE(att.attendance_sessions, 0) as attendance_sessions,
             (COALESCE(sub.approved_tasks, 0) * 10 + COALESCE(att.attendance_sessions, 0) * 5) as total_points
      FROM users u
      LEFT JOIN (
        SELECT student_id, COUNT(DISTINCT task_id) as approved_tasks
        FROM submissions
        WHERE status = 'approved'
        GROUP BY student_id
      ) sub ON u.id = sub.student_id
      LEFT JOIN (
        SELECT student_id, COUNT(*) as attendance_sessions
        FROM attendance_sessions
        WHERE status = 'completed'
        GROUP BY student_id
      ) att ON u.id = att.student_id
      WHERE u.role = 'student' AND u.status = 'active'
      ORDER BY total_points DESC, approved_tasks DESC, u.created_at ASC
    `).all() as {
      id: string;
      full_name: string;
      learning_level: string;
      approved_tasks: number;
      attendance_sessions: number;
      total_points: number;
    }[];

    const leaderboard = (rows || []).map((r, index) => ({
      rank: index + 1,
      id: r.id,
      name: r.full_name,
      learning_level: r.learning_level,
      approvedTasks: r.approved_tasks,
      attendanceSessions: r.attendance_sessions,
      totalPoints: r.total_points,
      isCurrentStudent: r.id === currentUserId,
    }));

    res.json({ leaderboard });
  } catch (error: any) {
    console.error('[Scoreboard Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to load scoreboard' });
  }
});
