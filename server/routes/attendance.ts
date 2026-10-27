import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit, getKarachiTimeString, getKarachiDateKey } from '../db.js';
import { authMiddleware, requireActive, type AuthRequest } from '../auth.js';
import type { AttendanceSession } from '../types.js';

export const attendanceRouter = Router();

// GET /api/attendance/status: Current active attendance status for logged-in user
attendanceRouter.get('/status', authMiddleware, requireActive, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const studentId = req.user.id;
  const todayKey = getKarachiDateKey();

  // Find currently open active session
  const activeSession = queryOne<AttendanceSession>(`
    SELECT * FROM attendance_sessions
    WHERE student_id = ? AND status = 'active'
    ORDER BY check_in_time DESC LIMIT 1
  `, studentId);

  // Find today's sessions
  const todaySessions = queryAll<AttendanceSession>(`
    SELECT * FROM attendance_sessions
    WHERE student_id = ? AND date_key = ?
    ORDER BY check_in_time ASC
  `, studentId, todayKey);

  // Monthly stats (current month in Asia/Karachi)
  const currentMonthPrefix = todayKey.substring(0, 7); // 'YYYY-MM'

  const distinctDaysPresent = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT date_key) as count
    FROM attendance_sessions
    WHERE student_id = ? AND date_key LIKE ?
  `, studentId, `${currentMonthPrefix}%`)?.count || 0;

  const completedSessionsThisMonth = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM attendance_sessions
    WHERE student_id = ? AND status = 'completed' AND date_key LIKE ?
  `, studentId, `${currentMonthPrefix}%`)?.count || 0;

  const totalMinutesThisMonth = queryOne<{ total: number }>(`
    SELECT COALESCE(SUM(duration_minutes), 0) as total
    FROM attendance_sessions
    WHERE student_id = ? AND status = 'completed' AND date_key LIKE ?
  `, studentId, `${currentMonthPrefix}%`)?.total || 0;

  res.json({
    isCheckedIn: Boolean(activeSession),
    activeSession: activeSession || null,
    serverCurrentTime: getKarachiTimeString(),
    dateKey: todayKey,
    todaySessions,
    monthlyStats: {
      daysPresent: distinctDaysPresent,
      completedSessions: completedSessionsThisMonth,
      totalHours: (totalMinutesThisMonth / 60).toFixed(1),
    },
    disclaimer: 'App-recorded attendance, not proof of physical presence.',
  });
});

// POST /api/attendance/check-in
attendanceRouter.post('/check-in', authMiddleware, requireActive, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const studentId = req.user.id;

  // Check if already checked in
  const existingActive = queryOne<{ id: string }>(`
    SELECT id FROM attendance_sessions
    WHERE student_id = ? AND status = 'active'
  `, studentId);

  if (existingActive) {
    res.status(400).json({ error: 'You are already checked in! Please check out first before starting a new session.' });
    return;
  }

  const now = new Date();
  const id = crypto.randomUUID();
  const checkInTime = now.toISOString();
  const checkInLocal = getKarachiTimeString(now);
  const dateKey = getKarachiDateKey(now);

  execute(`
    INSERT INTO attendance_sessions (id, student_id, check_in_time, check_in_local, status, date_key, duration_minutes)
    VALUES (?, ?, ?, ?, 'active', ?, 0)
  `, id, studentId, checkInTime, checkInLocal, dateKey);

  logAudit(req.user.id, req.user.full_name, req.user.role, 'ATTENDANCE_CHECKIN', `Checked in at ${checkInLocal}`);

  res.status(201).json({
    message: `Checked in successfully at ${checkInLocal}! Attendance is recording.`,
    session: {
      id,
      student_id: studentId,
      check_in_time: checkInTime,
      check_in_local: checkInLocal,
      status: 'active',
      date_key: dateKey,
    },
  });
});

// POST /api/attendance/check-out
attendanceRouter.post('/check-out', authMiddleware, requireActive, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const studentId = req.user.id;

  const activeSession = queryOne<AttendanceSession>(`
    SELECT * FROM attendance_sessions
    WHERE student_id = ? AND status = 'active'
    ORDER BY check_in_time DESC LIMIT 1
  `, studentId);

  if (!activeSession) {
    res.status(400).json({ error: 'No active check-in session found to check out from.' });
    return;
  }

  const now = new Date();
  const checkOutTime = now.toISOString();
  const checkOutLocal = getKarachiTimeString(now);
  const durationMs = Math.max(0, now.getTime() - new Date(activeSession.check_in_time).getTime());
  const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

  execute(`
    UPDATE attendance_sessions
    SET check_out_time = ?,
        check_out_local = ?,
        duration_minutes = ?,
        status = 'completed'
    WHERE id = ?
  `, checkOutTime, checkOutLocal, durationMinutes, activeSession.id);

  logAudit(
    req.user.id,
    req.user.full_name,
    req.user.role,
    'ATTENDANCE_CHECKOUT',
    `Checked out at ${checkOutLocal} (Duration: ${durationMinutes} minutes)`
  );

  res.json({
    message: `Checked out successfully! Session closed. Duration: ${durationMinutes} minute(s).`,
    session: {
      id: activeSession.id,
      duration_minutes: durationMinutes,
      check_out_time: checkOutTime,
      check_out_local: checkOutLocal,
      status: 'completed',
    },
  });
});

// GET /api/attendance/history: View attendance history log
attendanceRouter.get('/history', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const requestedStudentId = (req.query.student_id as string)?.trim();

  // If role is student, they can only view their own history
  if (req.user.role === 'student') {
    const history = queryAll<AttendanceSession>(`
      SELECT a.*, u.full_name as student_name, u.email as student_email
      FROM attendance_sessions a
      JOIN users u ON a.student_id = u.id
      WHERE a.student_id = ?
      ORDER BY a.check_in_time DESC
      LIMIT 100
    `, req.user.id);
    res.json({ history });
    return;
  }

  // If owner/admin/teacher:
  let history: any[];
  if (requestedStudentId) {
    history = queryAll<AttendanceSession>(`
      SELECT a.*, u.full_name as student_name, u.email as student_email
      FROM attendance_sessions a
      JOIN users u ON a.student_id = u.id
      WHERE a.student_id = ?
      ORDER BY a.check_in_time DESC
      LIMIT 100
    `, requestedStudentId);
  } else {
    // All recent student attendance
    history = queryAll<AttendanceSession>(`
      SELECT a.*, u.full_name as student_name, u.email as student_email
      FROM attendance_sessions a
      JOIN users u ON a.student_id = u.id
      WHERE u.role = 'student'
      ORDER BY a.check_in_time DESC
      LIMIT 100
    `);
  }

  res.json({ history });
});
