import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit } from '../db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../auth.js';
import type { TaskItem } from '../types.js';

export const tasksRouter = Router();

function getOptionalUserId(req: AuthRequest): string | null {
  const authHeader = req.headers.authorization || req.headers['x-auth-token'];
  if (!authHeader) return null;
  try {
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : typeof authHeader === 'string' ? authHeader.trim() : '';
    const [data] = token.split('.');
    if (!data) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload.userId || null;
  } catch {
    return null;
  }
}

// GET /api/tasks
tasksRouter.get('/', (req: AuthRequest, res: Response) => {
  const { book, day, category, search, status, student_id } = req.query;
  const currentUserId = (student_id as string) || getOptionalUserId(req);

  let query = `
    SELECT t.*,
           s.id as submission_id,
           s.status as submission_status,
           s.version as submission_version,
           s.fb_link,
           s.yt_link,
           s.li_link,
           s.insta_link,
           s.other_link,
           s.file_url,
           s.file_name,
           s.student_notes,
           s.reviewer_feedback,
           s.reviewed_at,
           s.submitted_at
    FROM tasks t
    LEFT JOIN submissions s ON t.id = s.task_id ${currentUserId ? 'AND s.student_id = ?' : 'AND 1=0'}
    WHERE 1=1
  `;
  const params: any[] = [];
  if (currentUserId) {
    params.push(currentUserId);
  }

  if (book) {
    query += ' AND t.book = ?';
    params.push(book);
  }
  if (day) {
    query += ' AND t.day_number = ?';
    params.push(Number(day));
  }
  if (category) {
    query += ' AND t.category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.book ASC, t.day_number ASC, t.order_index ASC';

  const rows = queryAll<any>(query, ...params);

  const tasks = rows.map((r) => ({
    id: r.id,
    book: r.book,
    day_number: r.day_number,
    title: r.title,
    description: r.description,
    category: r.category,
    required_links: JSON.parse(r.required_links || '[]'),
    allows_text: Boolean(r.allows_text),
    allows_file: Boolean(r.allows_file),
    status: r.status,
    source_flag: r.source_flag,
    order_index: r.order_index,
    created_at: r.created_at,
    submission: r.submission_id
      ? {
          id: r.submission_id,
          status: r.submission_status,
          version: r.submission_version,
          fb_link: r.fb_link,
          yt_link: r.yt_link,
          li_link: r.li_link,
          insta_link: r.insta_link,
          other_link: r.other_link,
          file_url: r.file_url,
          file_name: r.file_name,
          student_notes: r.student_notes,
          reviewer_feedback: r.reviewer_feedback,
          reviewed_at: r.reviewed_at,
          submitted_at: r.submitted_at,
        }
      : null,
  }));

  res.json({ tasks });
});

// GET /api/tasks/meta/stats
tasksRouter.get('/meta/stats', (_req, res: Response) => {
  const totalTasks = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE status = 'active'")?.count || 0;
  const book1Tasks = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE book = 'Book 1' AND status = 'active'")?.count || 0;
  const book2Tasks = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE book = 'Book 2' AND status = 'active'")?.count || 0;

  const categories = queryAll(`
    SELECT category, COUNT(*) as count
    FROM tasks
    WHERE status = 'active'
    GROUP BY category
    ORDER BY count DESC
  `);

  const days = queryAll<{ day_number: number }>(`
    SELECT DISTINCT day_number
    FROM tasks
    WHERE book = 'Book 1' AND status = 'active'
    ORDER BY day_number ASC
  `);

  const flaggedTasks = queryAll(`
    SELECT id, day_number, title, source_flag
    FROM tasks
    WHERE source_flag IS NOT NULL
  `);

  res.json({
    totalTasks,
    book1Tasks,
    book2Tasks,
    categories,
    days: days.map(d => d.day_number),
    flaggedTasks,
  });
});

// GET /api/tasks/:id
tasksRouter.get('/:id', (req, res: Response) => {
  const row = queryOne<TaskItem>('SELECT * FROM tasks WHERE id = ?', req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  res.json({
    task: {
      ...row,
      required_links: JSON.parse(row.required_links || '[]'),
      allows_text: Boolean(row.allows_text),
      allows_file: Boolean(row.allows_file),
    },
  });
});

// Owner/Admin: Create Task
tasksRouter.post('/', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const { book, day_number, title, description, category, required_links, allows_text, allows_file, source_flag } = req.body;

  if (!title || !description || !category || day_number === undefined) {
    res.status(400).json({ error: 'Title, description, category, and day number are required.' });
    return;
  }

  const id = crypto.randomUUID();
  const maxOrder = queryOne<{ max_idx: number }>('SELECT COALESCE(MAX(order_index), 0) as max_idx FROM tasks')?.max_idx || 0;
  const now = new Date().toISOString();

  execute(`
    INSERT INTO tasks (id, book, day_number, title, description, category, required_links, allows_text, allows_file, status, source_flag, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `,
    id,
    book || 'Book 1',
    Number(day_number),
    title.trim(),
    description.trim(),
    category.trim(),
    JSON.stringify(required_links || ['Facebook Post', 'YouTube Content']),
    allows_text !== false ? 1 : 0,
    allows_file ? 1 : 0,
    source_flag || null,
    maxOrder + 1,
    now
  );

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'TASK_CREATED', `Created task: Day ${day_number} - ${title}`);
  }

  res.status(201).json({ message: 'Task created successfully.', taskId: id });
});

// Owner/Admin: Update Task
tasksRouter.put('/:id', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const { book, day_number, title, description, category, required_links, allows_text, allows_file, status, source_flag } = req.body;

  const existing = queryOne<TaskItem>('SELECT * FROM tasks WHERE id = ?', req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  execute(`
    UPDATE tasks
    SET book = coalesce(?, book),
        day_number = coalesce(?, day_number),
        title = coalesce(?, title),
        description = coalesce(?, description),
        category = coalesce(?, category),
        required_links = coalesce(?, required_links),
        allows_text = coalesce(?, allows_text),
        allows_file = coalesce(?, allows_file),
        status = coalesce(?, status),
        source_flag = coalesce(?, source_flag)
    WHERE id = ?
  `,
    book || null,
    day_number !== undefined ? Number(day_number) : null,
    title ? title.trim() : null,
    description ? description.trim() : null,
    category ? category.trim() : null,
    required_links ? JSON.stringify(required_links) : null,
    allows_text !== undefined ? (allows_text ? 1 : 0) : null,
    allows_file !== undefined ? (allows_file ? 1 : 0) : null,
    status || null,
    source_flag || null,
    req.params.id
  );

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'TASK_UPDATED', `Updated task ${req.params.id}: ${title || existing.title}`);
  }

  res.json({ message: 'Task updated successfully.' });
});

// Owner: Archive Task
tasksRouter.delete('/:id', authMiddleware, requireRole('owner'), (req: AuthRequest, res: Response) => {
  const existing = queryOne<TaskItem>('SELECT * FROM tasks WHERE id = ?', req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  execute("UPDATE tasks SET status = 'archived' WHERE id = ?", req.params.id);

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'TASK_ARCHIVED', `Archived task ${req.params.id}: ${existing.title}`);
  }

  res.json({ message: 'Task safely archived.' });
});
