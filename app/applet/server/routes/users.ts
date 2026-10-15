import { Router, type Response } from 'express';
import { queryAll, queryOne, execute, logAudit } from '../db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../auth.js';
import type { User } from '../types.js';

export const usersRouter = Router();

// List all teachers (for dropdowns / assignment)
usersRouter.get('/teachers-list', authMiddleware, (_req, res: Response) => {
  const teachers = queryAll(`
    SELECT id, full_name, email, whatsapp, can_approve, can_admit
    FROM users
    WHERE role IN ('teacher', 'owner', 'admin') AND status = 'active'
    ORDER BY full_name ASC
  `);
  res.json({ teachers });
});

// Owner/Admin: List all users
usersRouter.get('/', authMiddleware, requireRole('owner', 'admin', 'teacher'), (req: AuthRequest, res: Response) => {
  const { role, status, search } = req.query;
  const currentUser = req.user!;

  let query = `
    SELECT u.id, u.email, u.full_name, u.father_name, u.whatsapp, u.role, u.status,
           u.learning_level, u.assigned_teacher_id, u.can_approve, u.can_admit, u.created_at,
           t.full_name as assigned_teacher_name
    FROM users u
    LEFT JOIN users t ON u.assigned_teacher_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Scoping: If user is teacher, they see ONLY assigned students!
  if (currentUser.role === 'teacher') {
    query += ' AND u.assigned_teacher_id = ?';
    params.push(currentUser.id);
  }

  if (role) {
    query += ' AND u.role = ?';
    params.push(role);
  }
  if (status) {
    query += ' AND u.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.whatsapp LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY u.created_at DESC';

  const rows = queryAll<any>(query, ...params);

  res.json({
    users: rows.map(r => ({
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      father_name: r.father_name,
      whatsapp: r.whatsapp,
      role: r.role,
      status: r.status,
      learning_level: r.learning_level,
      assigned_teacher_id: r.assigned_teacher_id,
      assigned_teacher_name: r.assigned_teacher_name,
      can_approve: Boolean(r.can_approve),
      can_admit: Boolean(r.can_admit),
      created_at: r.created_at,
    })),
  });
});

// Owner: Update user role / status / permissions / teacher assignment
usersRouter.put('/:id', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const actor = req.user!;
  const { role, status, assigned_teacher_id, can_approve, can_admit, learning_level } = req.body;

  const target = queryOne<User>('SELECT * FROM users WHERE id = ?', targetId);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Admins cannot change Owner or promote to Owner/Admin
  if (actor.role === 'admin') {
    if (target.role === 'owner' || role === 'owner' || role === 'admin') {
      res.status(403).json({ error: 'Only the Academy Owner can modify Owner/Admin roles.' });
      return;
    }
  }

  // Target cannot demote the only owner
  if (target.role === 'owner' && role && role !== 'owner') {
    const ownerCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'owner'")?.count || 0;
    if (ownerCount <= 1) {
      res.status(400).json({ error: 'Cannot change role. At least one Owner must remain active.' });
      return;
    }
  }

  const now = new Date().toISOString();

  execute(`
    UPDATE users
    SET role = coalesce(?, role),
        status = coalesce(?, status),
        assigned_teacher_id = coalesce(?, assigned_teacher_id),
        can_approve = coalesce(?, can_approve),
        can_admit = coalesce(?, can_admit),
        learning_level = coalesce(?, learning_level),
        updated_at = ?
    WHERE id = ?
  `,
    role || null,
    status || null,
    assigned_teacher_id !== undefined ? (assigned_teacher_id || null) : null,
    can_approve !== undefined ? (can_approve ? 1 : 0) : null,
    can_admit !== undefined ? (can_admit ? 1 : 0) : null,
    learning_level || null,
    now,
    targetId
  );

  logAudit(
    actor.id,
    actor.full_name,
    actor.role,
    'USER_MANAGEMENT_UPDATE',
    `Updated user ${target.email} (${target.full_name}): role=${role || target.role}, status=${status || target.status}`
  );

  res.json({ message: 'User updated successfully.' });
});

// Owner/Admin: View Audit Logs
usersRouter.get('/audit-logs', authMiddleware, requireRole('owner', 'admin'), (_req, res: Response) => {
  const logs = queryAll(`
    SELECT * FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT 100
  `);
  res.json({ logs });
});
