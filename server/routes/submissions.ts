import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit, getStudentIdAliases, ensureUserInSqlite, findUserByEmailOrAlias } from '../db.js';
import { persistSubmissionToFirestore } from '../hydration.js';
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
  const targetIds = getStudentIdAliases(studentId);
  const inClause = `s.student_id IN (${targetIds.map(() => '?').join(',')})`;
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
        WHERE ${inClause} AND s.status = 'approved' AND t.status = 'active'
      `, ...targetIds)?.count || 0
    : queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE ${inClause} AND s.status = 'approved' AND t.book = ? AND t.status = 'active'
      `, ...targetIds, book)?.count || 0;

  const pendingCount = isAll
    ? queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE ${inClause} AND s.status = 'submitted' AND t.status = 'active'
      `, ...targetIds)?.count || 0
    : queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE ${inClause} AND s.status = 'submitted' AND t.book = ? AND t.status = 'active'
      `, ...targetIds, book)?.count || 0;

  const needsCorrectionCount = isAll
    ? queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE ${inClause} AND s.status IN ('needs_correction', 'rejected') AND t.status = 'active'
      `, ...targetIds)?.count || 0
    : queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT s.task_id) as count
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE ${inClause} AND s.status IN ('needs_correction', 'rejected') AND t.book = ? AND t.status = 'active'
      `, ...targetIds, book)?.count || 0;

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

  // Ensure authenticated user exists in SQLite before inserting submission (prevents FOREIGN KEY failures for Firestore-hydrated users)
  ensureUserInSqlite(req.user);

  const studentId = req.user.id;
  const task_id = req.body.task_id || req.body.taskId;
  const fb_link = req.body.fb_link || req.body.fbLink;
  const yt_link = req.body.yt_link || req.body.ytLink;
  const li_link = req.body.li_link || req.body.liLink;
  const insta_link = req.body.insta_link || req.body.instaLink;
  const other_link = req.body.other_link || req.body.otherLink;
  const file_url = req.body.file_url || req.body.fileUrl;
  const file_name = req.body.file_name || req.body.fileName;
  const student_notes = req.body.student_notes || req.body.studentNotes;

  if (!task_id) {
    res.status(400).json({ error: 'Task ID is required.' });
    return;
  }

  // Verify task exists
  const task = queryOne('SELECT * FROM tasks WHERE id = ?', String(task_id));
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  // Robust URL / proof link cleaner
  const cleanProofLink = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    let str = raw.trim();
    if (!str) return null;
    // Strip surrounding quotes
    str = str.replace(/^["'`]|["'`]$/g, '').trim();
    if (!str) return null;

    // If mobile pasted share text like: "Check out this video https://youtu.be/xyz"
    const urlMatch = str.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      return urlMatch[0];
    }

    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      if (str.includes('.') || str.includes('/')) {
        return `https://${str}`;
      }
    }
    return str;
  };

  const cleanFb = cleanProofLink(fb_link);
  const cleanYt = cleanProofLink(yt_link);
  const cleanLi = cleanProofLink(li_link);
  const cleanInsta = cleanProofLink(insta_link);
  const cleanOther = cleanProofLink(other_link);
  const cleanFile = file_url?.trim() || null;
  const cleanFileName = file_name?.trim() || null;
  const cleanNotes = student_notes?.trim() || null;

  // Validate at least one valid submission proof or reflection is provided
  const hasProof = Boolean(cleanFb || cleanYt || cleanLi || cleanInsta || cleanOther || cleanFile || cleanNotes);
  if (!hasProof) {
    res.status(400).json({ error: 'Please enter at least one proof link, code explanation, or upload proof.' });
    return;
  }

  // Check if existing submission exists across known student ID aliases
  const studentAliases = getStudentIdAliases(studentId);
  const existing = queryOne<Submission>(`
    SELECT * FROM submissions
    WHERE student_id IN (${studentAliases.map(() => '?').join(',')}) AND task_id = ?
    ORDER BY version DESC LIMIT 1
  `, ...studentAliases, String(task_id));

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
      cleanFb,
      cleanYt,
      cleanLi,
      cleanInsta,
      cleanOther,
      cleanFile,
      cleanFileName,
      cleanNotes,
      now,
      existing.id
    );

    logAudit(req.user.id, req.user.full_name, req.user.role, 'TASK_RESUBMITTED', `Resubmitted task ${task_id} (Version ${nextVersion})`);

    // Mirror to the durable Firestore store (fire-and-forget)
    void persistSubmissionToFirestore(existing.id);

    res.json({
      message: 'Task submitted successfully! Your submission is now in the Owner review queue.',
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
      cleanFb,
      cleanYt,
      cleanLi,
      cleanInsta,
      cleanOther,
      cleanFile,
      cleanFileName,
      cleanNotes,
      now,
      now
    );

    logAudit(req.user.id, req.user.full_name, req.user.role, 'TASK_SUBMITTED', `Submitted task ${task_id} (Version 1)`);

    // Mirror to the durable Firestore store (fire-and-forget)
    void persistSubmissionToFirestore(id);

    res.status(201).json({
      message: 'Task submitted successfully! It is now pending approval by Farukh Businessman Wala.',
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
           COALESCE(u.full_name, 'Student') as student_name,
           COALESCE(u.email, '') as student_email,
           u.assigned_teacher_id,
           u.registered_by_id,
           t2.full_name as assigned_teacher_name,
           COALESCE(t.title, 'Task') as task_title,
           COALESCE(t.day_number, 1) as task_day,
           COALESCE(t.category, 'General') as task_category,
           COALESCE(t.book, 'Book 1') as task_book
    FROM submissions s
    LEFT JOIN users u ON u.id = s.student_id
    LEFT JOIN users t2 ON u.assigned_teacher_id = t2.id
    LEFT JOIN tasks t ON s.task_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Scoping: If user is teacher, they see ONLY students they registered or assigned to them!
  if (user.role === 'teacher') {
    query += ' AND (u.assigned_teacher_id = ? OR u.registered_by_id = ?)';
    params.push(user.id, user.id);
  }

  if (student_id) {
    const sIds = getStudentIdAliases(String(student_id));
    query += ` AND s.student_id IN (${sIds.map(() => '?').join(',')})`;
    params.push(...sIds);
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
  const submissionId = String(req.params.id);
  const { decision, feedback, submissionSnapshot } = req.body;

  if (!['approved', 'needs_correction', 'rejected'].includes(decision)) {
    res.status(400).json({ error: "Decision must be one of: 'approved', 'needs_correction', 'rejected'." });
    return;
  }

  let sub = queryOne<Submission & { student_name: string; assigned_teacher_id?: string | null; registered_by_id?: string | null }>(`
    SELECT s.*,
           COALESCE(u.full_name, 'Student') as student_name,
           u.assigned_teacher_id,
           u.registered_by_id
    FROM submissions s
    LEFT JOIN users u ON u.id = s.student_id
    WHERE s.id = ?
  `, submissionId);

  // If submission exists in Firestore but wasn't synced into SQLite yet, hydrate safely from snapshot
  if (!sub && submissionSnapshot && typeof submissionSnapshot === 'object') {
    const snapEmail = submissionSnapshot.student_email ? String(submissionSnapshot.student_email).toLowerCase().trim() : '';
    let studentRow = snapEmail
      ? findUserByEmailOrAlias<any>(snapEmail)
      : queryOne<any>('SELECT * FROM users WHERE id = ?', String(submissionSnapshot.student_id || ''));

    if (!studentRow && (submissionSnapshot.student_id || snapEmail)) {
      ensureUserInSqlite({
        id: String(submissionSnapshot.student_id || snapEmail),
        email: snapEmail || `${submissionSnapshot.student_id}@rehanschool.edu.pk`,
        full_name: submissionSnapshot.student_name || 'Student',
        role: 'student',
        status: 'active',
        assigned_teacher_id: submissionSnapshot.assigned_teacher_id || null,
        registered_by_id: submissionSnapshot.registered_by_id || null,
      });
      studentRow = queryOne<any>('SELECT * FROM users WHERE id = ?', String(submissionSnapshot.student_id || snapEmail));
    }

    if (studentRow && submissionSnapshot.task_id) {
      // Check teacher permission before hydrating
      if (reviewer.role === 'teacher') {
        const ownerMatch =
          studentRow.assigned_teacher_id === reviewer.id ||
          studentRow.registered_by_id === reviewer.id ||
          submissionSnapshot.assigned_teacher_id === reviewer.id ||
          submissionSnapshot.registered_by_id === reviewer.id;
        if (!ownerMatch) {
          res.status(403).json({ error: 'You are only authorized to review submissions for students assigned to you.' });
          return;
        }
      }

      const taskRow = queryOne('SELECT id FROM tasks WHERE id = ?', String(submissionSnapshot.task_id));
      if (taskRow) {
        const nowSnap = new Date().toISOString();
        execute(`
          INSERT OR IGNORE INTO submissions (
            id, student_id, task_id, version, status,
            fb_link, yt_link, li_link, insta_link, other_link,
            file_url, file_name, student_notes, submitted_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          submissionId,
          studentRow.id,
          String(submissionSnapshot.task_id),
          submissionSnapshot.version || 1,
          submissionSnapshot.status || 'submitted',
          submissionSnapshot.fb_link || null,
          submissionSnapshot.yt_link || null,
          submissionSnapshot.li_link || null,
          submissionSnapshot.insta_link || null,
          submissionSnapshot.other_link || null,
          submissionSnapshot.file_url || null,
          submissionSnapshot.file_name || null,
          submissionSnapshot.student_notes || null,
          submissionSnapshot.submitted_at || nowSnap,
          submissionSnapshot.updated_at || nowSnap
        );

        sub = {
          id: submissionId,
          student_id: studentRow.id,
          task_id: String(submissionSnapshot.task_id),
          version: submissionSnapshot.version || 1,
          status: submissionSnapshot.status || 'submitted',
          fb_link: submissionSnapshot.fb_link || null,
          yt_link: submissionSnapshot.yt_link || null,
          li_link: submissionSnapshot.li_link || null,
          insta_link: submissionSnapshot.insta_link || null,
          other_link: submissionSnapshot.other_link || null,
          file_url: submissionSnapshot.file_url || null,
          file_name: submissionSnapshot.file_name || null,
          student_notes: submissionSnapshot.student_notes || null,
          submitted_at: submissionSnapshot.submitted_at || nowSnap,
          updated_at: submissionSnapshot.updated_at || nowSnap,
          student_name: studentRow.full_name || submissionSnapshot.student_name || 'Student',
          assigned_teacher_id: studentRow.assigned_teacher_id || submissionSnapshot.assigned_teacher_id || null,
          registered_by_id: studentRow.registered_by_id || submissionSnapshot.registered_by_id || null,
        };
      }
    }
  }

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
    const isMyStudent = sub.assigned_teacher_id === reviewer.id || sub.registered_by_id === reviewer.id;
    if (!isMyStudent) {
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

  // Mirror the review decision to the durable Firestore store (fire-and-forget)
  void persistSubmissionToFirestore(submissionId);

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
