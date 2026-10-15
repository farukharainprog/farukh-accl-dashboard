import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit } from '../db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../auth.js';
import type { Batch } from '../types.js';

export const batchesRouter = Router();

// GET /api/batches: List active batches with enrollment status for logged-in student
batchesRouter.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || '';

  const rows = queryAll<any>(`
    SELECT b.*,
           (SELECT COUNT(*) FROM batch_enrollments be WHERE be.batch_id = b.id) as enrolled_count,
           (SELECT COUNT(*) FROM batch_enrollments be WHERE be.batch_id = b.id AND be.student_id = ?) as is_enrolled
    FROM batches b
    WHERE b.status = 'active'
    ORDER BY b.created_at DESC
  `, userId);

  res.json({
    batches: rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      teacher_id: r.teacher_id,
      teacher_name: r.teacher_name,
      schedule: r.schedule,
      zoom_link: r.zoom_link,
      max_students: r.max_students,
      status: r.status,
      created_at: r.created_at,
      enrolled_count: Number(r.enrolled_count || 0),
      is_enrolled: Boolean(r.is_enrolled),
    })),
  });
});

// Student: Enroll in batch
batchesRouter.post('/:id/enroll', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const batchId = req.params.id;
  const studentId = req.user.id;

  const batch = queryOne<Batch>('SELECT * FROM batches WHERE id = ?', batchId);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  const existing = queryOne('SELECT id FROM batch_enrollments WHERE batch_id = ? AND student_id = ?', batchId, studentId);
  if (existing) {
    res.status(400).json({ error: 'You are already enrolled in this learning batch.' });
    return;
  }

  const currentCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM batch_enrollments WHERE batch_id = ?', batchId)?.count || 0;
  if (currentCount >= batch.max_students) {
    res.status(400).json({ error: 'This batch has reached its maximum student capacity.' });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  execute(`
    INSERT INTO batch_enrollments (id, batch_id, student_id, status, enrolled_at)
    VALUES (?, ?, ?, 'enrolled', ?)
  `, id, batchId, studentId, now);

  logAudit(req.user.id, req.user.full_name, req.user.role, 'BATCH_ENROLLED', `Enrolled in batch: ${batch.title}`);

  res.status(201).json({ message: `Successfully enrolled in ${batch.title}!` });
});

// Owner/Admin: Create Batch
batchesRouter.post('/', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const { title, description, teacher_id, teacher_name, schedule, zoom_link, max_students } = req.body;

  if (!title || !schedule) {
    res.status(400).json({ error: 'Batch title and schedule are required.' });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  execute(`
    INSERT INTO batches (id, title, description, teacher_id, teacher_name, schedule, zoom_link, max_students, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `,
    id,
    title.trim(),
    description ? description.trim() : null,
    teacher_id || null,
    teacher_name ? teacher_name.trim() : null,
    schedule.trim(),
    zoom_link ? zoom_link.trim() : null,
    max_students ? Number(max_students) : 25,
    now
  );

  res.status(201).json({ message: 'Group learning batch created successfully.', batchId: id });
});
