import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit } from '../db.js';
import { authMiddleware, requireActive, type AuthRequest } from '../auth.js';
import type { Submission } from '../types.js';

export const submissionsRouter = Router();

// Student: Get submission summary counts
submissionsRouter.get('/summary/me', authMiddleware, requireActive, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const studentId = req.user.id;
  const book = (req.query.book as string) || req.user.learning_level || 'Book 1';

  const isAll = !book || book === 'all';

  // Total required active tasks in current book or all books
  const totalTasks = isAll
    ? queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE status = 'active'")?.count || 0
    : queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE book = ? AND status = 'active'", book)?.count || 0;

  // Student's submissions in this book or across all books
  const approvedCount = isAll
    ? queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.student_id = ? AND s.status = 'approved' AND t.status = 'active'
      `, studentId)?.count || 0
    : queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.student_id = ? AND s.status = 'approved' AND t.book = ? AND t.status = 'active'
      `, studentId, book)?.count || 0;

  const pendingCount = isAll
    ? queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.student_id = ? AND s.status = 'submitted' AND t.status = 'active'
      `, studentId)?.count || 0
    : queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.student_id = ? AND s.status = 'submitted' AND t.book = ? AND t.status = 'active'
      `, studentId, book)?.count || 0;

  const needsCorrectionCount = isAll
    ? queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.student_id = ? AND s.status IN ('needs_correction', 'rejected') AND t.status = 'active'
      `, studentId)?.count || 0
    : queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.student_id = ? AND s.status IN ('needs_correction', 'rejected') AND t.book = ? AND t.status = 'active'
      `, studentId, book)?.count || 0;

  const remainingTasks = Math.max(0, totalTasks - approvedCount);
  const progressPercent = totalTasks > 0 ? Math.min(100, Math.round((approvedCount / totalTasks) * 100)) : 0;

  res.json({
    book,
    totalTasks,
    approvedCount,
    pendingCount,
    needsCorrectionCount,
    remainingTasks,
    progressPercent,
  });
});

// Student: Submit or Resubmit a task
submissionsRouter.post('/', authMiddleware, requireActive, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const studentId = req.user.id;
  const { task_id, fb_link, yt_link, li_link, insta_link, other_link, file_url, file_name, student_notes } = req.body;

  if (!task_id) {
    res.status(400).json({ error: 'Task ID is required.' });
    return;
  }

  // Verify task exists
  const task = queryOne('SELECT * FROM tasks WHERE id = ?', task_id);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  // Validate at least one valid submission proof is provided
  const hasLink = Boolean(fb_link?.trim() || yt_link?.trim() || li_link?.trim() || insta_link?.trim() || other_link?.trim());
  const hasFile = Boolean(file_url?.trim());
  const hasNotes = Boolean(student_notes?.trim());

  if (!hasLink && !hasFile && !hasNotes) {
    res.status(400).json({ error: 'Please provide at least one proof link, code explanation, or file upload.' });
    return;
  }

  // URL sanity check
  const links = [fb_link, yt_link, li_link, insta_link, other_link].filter(Boolean);
  for (const l of links) {
    if (typeof l === 'string' && l.trim()) {
      try {
        const url = new URL(l.trim().startsWith('http') ? l.trim() : `https://${l.trim()}`);
        if (!url.hostname) throw new Error('Invalid URL');
      } catch {
        res.status(400).json({ error: `Invalid URL format: "${l}". Please enter a valid web address.` });
        return;
      }
    }
  }

  // Check if existing submission exists
  const existing = queryOne<Submission>(`
    SELECT * FROM submissions WHERE student_id = ? AND task_id = ? ORDER BY version DESC LIMIT 1
  `, studentId, task_id);

  const now = new Date().toISOString();

  if (existing) {
    // If already approved, locked unless reviewer reopened it
    if (existing.status === 'approved') {
      res.status(400).json({ error: 'This task is already Approved and completed! It cannot be modified.' });
      return;
    }

    // Archive current version into submission_history before updating to new version
    const historyId = crypto.randomUUID();
    execute(`
      INSERT INTO submission_history (id, submission_id, student_id, task_id, version, status, links_json, student_notes, reviewer_id, reviewer_name, reviewer_feedback, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      historyId,
      existing.id,
      existing.student_id,
      existing.task_id,
      existing.version,
      existing.status,
      JSON.stringify({
        fb_link: existing.fb_link,
        yt_link: existing.yt_link,
        li_link: existing.li_link,
        insta_link: existing.insta_link,
        other_link: existing.other_link,
        file_url: existing.file_url,
      }),
      existing.student_notes,
      existing.reviewer_id,
      existing.reviewer_name,
      existing.reviewer_feedback,
      existing.updated_at || now
    );

    const nextVersion = existing.version + 1;

    execute(`
      UPDATE submissions
      SET version = ?,
          status = 'submitted',
          fb_link = ?,
          yt_link = ?,
          li_link = ?,
          insta_link = ?,
          other_link = ?,
          file_url = ?,
          file_name = ?,
          student_notes = ?,
          reviewer_feedback = NULL,
          reviewer_id = NULL,
          reviewer_name = NULL,
          reviewed_at = NULL,
          updated_at = ?
      WHERE id = ?
    `,
      nextVersion,
      fb_link?.trim() || null,
      yt_link?.trim() || null,
      li_link?.trim() || null,
      insta_link?.trim() || null,
      other_link?.trim() || null,
      file_url?.trim() || null,
      file_name?.trim() || null,
      student_notes?.trim() || null,
      now,
      existing.id
    );

    logAudit(req.user.id, req.user.full_name, req.user.role, 'TASK_RESUBMITTED', `Resubmitted task ${task_id} (Version ${nextVersion})`);

    res.json({
      message: 'Task resubmitted successfully! Your revision is now Pending Review.',
      submissionId: existing.id,
      version: nextVersion,
      status: 'submitted',
    });
  } else {
    // New submission
    const id = crypto.randomUUID();
    execute(`
      INSERT INTO submissions (id, student_id, task_id, version, status, fb_link, yt_link, li_link, insta_link, other_link, file_url, file_name, student_notes, submitted_at, updated_at)
      VALUES (?, ?, ?, 1, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      studentId,
      task_id,
      fb_link?.trim() || null,
      yt_link?.trim() || null,
      li_link?.trim() || null,
      insta_link?.trim() || null,
      other_link?.trim() || null,
      file_url?.trim() || null,
      file_name?.trim() || null,
      student_notes?.trim() || null,
      now,
      now
    );

    logAudit(req.user.id, req.user.full_name, req.user.role, 'TASK_SUBMITTED', `Submitted task ${task_id} (Version 1)`);

    res.status(201).json({
      message: 'Task submitted successfully! It has been placed in the Pending Review queue.',
      submissionId: id,
      version: 1,
      status: 'submitted',
    });
  }
});

// GET /api/submissions/queue: Review Queue for Owner, Admin, and assigned Teachers
submissionsRouter.get('/queue', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { status, book, search, student_id } = req.query;
  const user = req.user;

  let query = `
    SELECT s.*,
           u.full_name as student_name,
           u.email as student_email,
           u.assigned_teacher_id,
           t.title as task_title,
           t.day_number as task_day,
           t.category as task_category,
           t.book as task_book
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    JOIN tasks t ON s.task_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Scoping: If user is teacher, they see ONLY assigned students!
  if (user.role === 'teacher') {
    query += ' AND u.assigned_teacher_id = ?';
    params.push(user.id);
  }

  if (student_id) {
    query += ' AND s.student_id = ?';
    params.push(student_id);
  }

  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }

  if (book) {
    query += ' AND t.book = ?';
    params.push(book);
  }

  if (search) {
    query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR t.title LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY s.updated_at DESC';

  const submissions = queryAll(query, ...params);
  res.json({ submissions });
});

// Review submission: Approve, Needs Correction, Reject, Feedback
submissionsRouter.post('/:id/review', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const reviewer = req.user;
  const submissionId = req.params.id;
  const { decision, feedback } = req.body;

  if (!['approved', 'needs_correction', 'rejected'].includes(decision)) {
    res.status(400).json({ error: "Decision must be one of: 'approved', 'needs_correction', 'rejected'." });
    return;
  }

  const sub = queryOne<Submission & { student_name: string; assigned_teacher_id?: string }>(`
    SELECT s.*, u.full_name as student_name, u.assigned_teacher_id
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    WHERE s.id = ?
  `, submissionId);

  if (!sub) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  // Role checks
  if (reviewer.role === 'student') {
    res.status(403).json({ error: 'Students cannot review or approve submissions.' });
    return;
  }

  if (reviewer.role === 'teacher') {
    if (sub.assigned_teacher_id !== reviewer.id) {
      res.status(403).json({ error: 'You are only authorized to review submissions for students assigned to you.' });
      return;
    }

    if (decision === 'approved' && !reviewer.can_approve) {
      res.status(403).json({
        error: 'Teacher approval permission is disabled for your account. You can request corrections or leave feedback, but final approval requires the Academy Owner.',
      });
      return;
    }
  }

  const now = new Date().toISOString();

  execute(`
    UPDATE submissions
    SET status = ?,
        reviewer_id = ?,
        reviewer_name = ?,
        reviewer_feedback = ?,
        reviewed_at = ?,
        updated_at = ?
    WHERE id = ?
  `, decision, reviewer.id, reviewer.full_name, feedback?.trim() || null, now, now, submissionId);

  const historyId = crypto.randomUUID();
  execute(`
    INSERT INTO submission_history (id, submission_id, student_id, task_id, version, status, links_json, student_notes, reviewer_id, reviewer_name, reviewer_feedback, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    historyId,
    sub.id,
    sub.student_id,
    sub.task_id,
    sub.version,
    decision,
    JSON.stringify({
      fb_link: sub.fb_link,
      yt_link: sub.yt_link,
      li_link: sub.li_link,
      insta_link: sub.insta_link,
      other_link: sub.other_link,
      file_url: sub.file_url,
    }),
    sub.student_notes,
    reviewer.id,
    reviewer.full_name,
    feedback?.trim() || null,
    now
  );

  logAudit(
    reviewer.id,
    reviewer.full_name,
    reviewer.role,
    'SUBMISSION_REVIEWED',
    `Marked submission for ${sub.student_name} as ${decision.toUpperCase()}. Feedback: ${feedback || 'None'}`
  );

  res.json({
    message: `Submission successfully marked as ${decision === 'approved' ? 'Approved' : 'Needs Correction'}.`,
    decision,
    reviewed_at: now,
  });
});

// Get task submission history
submissionsRouter.get('/:taskId/history', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const studentId = (req.query.student_id as string) || req.user.id;

  if (req.user.role === 'student' && studentId !== req.user.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const history = queryAll(`
    SELECT * FROM submission_history
    WHERE task_id = ? AND student_id = ?
    ORDER BY version ASC, timestamp ASC
  `, req.params.taskId, studentId);

  res.json({ history });
});
