import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit } from '../db.js';
import { authMiddleware, requireRole, type AuthRequest, hashPassword } from '../auth.js';
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
  const { full_name, father_name, whatsapp, role, status, assigned_teacher_id, can_approve, can_admit, learning_level } = req.body;

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
    SET full_name = coalesce(?, full_name),
        father_name = coalesce(?, father_name),
        whatsapp = coalesce(?, whatsapp),
        role = coalesce(?, role),
        status = coalesce(?, status),
        assigned_teacher_id = coalesce(?, assigned_teacher_id),
        can_approve = coalesce(?, can_approve),
        can_admit = coalesce(?, can_admit),
        learning_level = coalesce(?, learning_level),
        updated_at = ?
    WHERE id = ?
  `,
    full_name ? full_name.trim() : null,
    father_name ? father_name.trim() : null,
    whatsapp ? whatsapp.trim() : null,
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

// Owner: Delete user
usersRouter.delete('/:id', authMiddleware, requireRole('owner'), (req: AuthRequest, res: Response) => {
  const target = queryOne<User>('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  if (target.role === 'owner') {
    res.status(400).json({ error: 'Cannot delete Owner account.' });
    return;
  }
  execute('DELETE FROM users WHERE id = ?', req.params.id);
  execute('DELETE FROM student_admissions WHERE email = ?', target.email);
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'USER_DELETED', `Deleted user ${target.email} (${target.full_name})`);
  res.json({ message: `User ${target.full_name} has been deleted.` });
});


// Owner/Admin: Direct Student Registration (Only 3 required fields: Name, WhatsApp, Gmail)
usersRouter.post('/register-student', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { full_name, whatsapp, email, learning_level } = req.body || {};

    if (!full_name || !whatsapp || !email) {
      res.status(400).json({ error: 'Student Name, WhatsApp Number, and Gmail Address are required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = String(full_name).trim();
    const cleanWa = String(whatsapp).trim();

    // Check duplicate email
    const existing = queryOne<{ id: string; role: string }>('SELECT id, role FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', cleanEmail);
    if (existing) {
      if (existing.role === 'student') {
        // Update student details and make sure status is active
        execute(`
          UPDATE users
          SET full_name = ?, whatsapp = ?, status = 'active', learning_level = ?, updated_at = ?
          WHERE id = ?
        `, cleanName, cleanWa, learning_level || 'Book 1', new Date().toISOString(), existing.id);

        execute(`
          UPDATE student_admissions
          SET full_name = ?, whatsapp = ?, status = 'approved', reviewed_at = ?
          WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
        `, cleanName, cleanWa, new Date().toISOString(), cleanEmail);

        res.status(200).json({
          message: `Student "${cleanName}" was updated and activated successfully! They can now sign in using Google Sign-In with ${cleanEmail}.`,
          student: {
            id: existing.id,
            full_name: cleanName,
            email: cleanEmail,
            whatsapp: cleanWa,
            role: 'student',
            status: 'active',
            learning_level: learning_level || 'Book 1',
          },
        });
        return;
      }
      res.status(400).json({ error: `A user with Gmail address "${cleanEmail}" already exists in the system.` });
      return;
    }

    const id = crypto.randomUUID();
    const initialPassword = 'acclStudent@2026';
    const { salt, hash } = hashPassword(initialPassword);
    const now = new Date().toISOString();
    const level = learning_level || 'Book 1';

    execute(`
      INSERT INTO users (
        id, email, password_hash, salt, full_name, father_name, whatsapp,
        role, status, learning_level, can_approve, can_admit, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'active', ?, 0, 0, ?, ?)
    `,
      id,
      cleanEmail,
      hash,
      salt,
      cleanName,
      null,
      cleanWa,
      level,
      now,
      now
    );

    // Also insert or update record into student_admissions with status 'approved'
    const admId = crypto.randomUUID();
    execute(`
      INSERT OR REPLACE INTO student_admissions (id, full_name, father_name, whatsapp, email, learning_level, registered_by_id, notes, status, created_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
    `,
      admId,
      cleanName,
      'N/A',
      cleanWa,
      cleanEmail,
      level,
      actor.id,
      `Registered directly by Owner (${actor.full_name}) for passwordless Google Sign-In`,
      now,
      now
    );

    logAudit(actor.id, actor.full_name, actor.role, 'STUDENT_REGISTERED_BY_OWNER', `Owner registered student: ${cleanName} (${cleanEmail}, WA: ${cleanWa})`);

    res.status(201).json({
      message: `Student "${cleanName}" registered successfully! They can now sign in using Google Sign-In with ${cleanEmail}.`,
      student: {
        id,
        full_name: cleanName,
        email: cleanEmail,
        whatsapp: cleanWa,
        role: 'student',
        status: 'active',
        learning_level: level,
        created_at: now,
      },
    });
  } catch (error: any) {
    console.error('[Register Student Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to register student.' });
  }
});

// Owner/Admin: Get all students with comprehensive progress reports & submissions overview
usersRouter.get('/students-overview', authMiddleware, requireRole('owner', 'admin', 'teacher'), (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    let filterClause = '';
    const params: any[] = [];

    if (actor.role === 'teacher') {
      filterClause = ' AND u.assigned_teacher_id = ?';
      params.push(actor.id);
    }

    // Total tasks in Book 1
    const totalBook1 = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE book = 'Book 1' AND status = 'active'")?.count || 180;

    const query = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.whatsapp, 
        u.status, 
        u.learning_level, 
        u.created_at,
        COUNT(DISTINCT s.id) as total_submissions,
        SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN s.status = 'submitted' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN s.status IN ('needs_correction', 'rejected') THEN 1 ELSE 0 END) as rejected_count,
        MAX(s.updated_at) as last_submission_at
      FROM users u
      LEFT JOIN submissions s ON u.id = s.student_id
      WHERE u.role = 'student' ${filterClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    const rows = queryAll<any>(query, ...params);

    const students = rows.map((r) => {
      const approved = Number(r.approved_count || 0);
      const progressPercent = totalBook1 > 0 ? Math.min(100, Math.round((approved / totalBook1) * 100)) : 0;
      return {
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        whatsapp: r.whatsapp,
        status: r.status,
        learning_level: r.learning_level || 'Book 1',
        created_at: r.created_at,
        total_submissions: Number(r.total_submissions || 0),
        approved_count: approved,
        pending_count: Number(r.pending_count || 0),
        rejected_count: Number(r.rejected_count || 0),
        progress_percent: progressPercent,
        last_submission_at: r.last_submission_at,
      };
    });

    res.json({ students, totalCurriculumTasks: totalBook1 });
  } catch (error: any) {
    console.error('[Students Overview Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch students overview.' });
  }
});

// Owner/Admin: Direct Teacher Registration
usersRouter.post('/register-teacher', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { full_name, email, whatsapp, subjects, password, can_approve } = req.body || {};

    if (!full_name || !email) {
      res.status(400).json({ error: 'Teacher Full Name and Email address are required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = String(full_name).trim();
    const cleanWa = whatsapp ? String(whatsapp).trim() : '';

    const existing = queryOne<{ id: string; role: string }>('SELECT id, role FROM users WHERE email = ?', cleanEmail);
    if (existing) {
      res.status(400).json({ error: `A user with email "${cleanEmail}" already exists in the system.` });
      return;
    }

    const teacherPassword = password ? String(password).trim() : 'teacher@accl2026';
    const { salt, hash } = hashPassword(teacherPassword);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    execute(`
      INSERT INTO users (
        id, email, password_hash, salt, full_name, whatsapp,
        role, status, learning_level, can_approve, can_admit, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'teacher', 'active', 'Book 1', ?, 0, ?, ?)
    `,
      id,
      cleanEmail,
      hash,
      salt,
      cleanName,
      cleanWa,
      can_approve !== false ? 1 : 0,
      now,
      now
    );

    // Also record into teacher_applications as approved
    const appId = crypto.randomUUID();
    execute(`
      INSERT INTO teacher_applications (
        id, full_name, email, whatsapp, subjects, introduction, status, created_at, reviewed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)
    `,
      appId,
      cleanName,
      cleanEmail,
      cleanWa,
      subjects ? String(subjects).trim() : 'General Curriculum Facilitator',
      `Registered directly by Owner (${actor.full_name})`,
      now,
      now
    );

    logAudit(actor.id, actor.full_name, actor.role, 'TEACHER_REGISTERED_BY_OWNER', `Owner registered teacher: ${cleanName} (${cleanEmail})`);

    res.status(201).json({
      message: `Teacher "${cleanName}" registered successfully! Initial temporary password: ${teacherPassword}`,
      teacher: {
        id,
        full_name: cleanName,
        email: cleanEmail,
        whatsapp: cleanWa,
        role: 'teacher',
        status: 'active',
        can_approve: can_approve !== false,
        created_at: now,
      },
      temporaryPassword: teacherPassword,
    });
  } catch (error: any) {
    console.error('[Register Teacher Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to register teacher.' });
  }
});

// Owner: Clear dummy student admissions and non-approved students
usersRouter.post('/clear-dummy-students', authMiddleware, requireRole('owner'), (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    // Delete students who have no submissions or are marked dummy/pending rejected
    const deletedCount = execute(`
      DELETE FROM student_admissions
      WHERE status IN ('rejected', 'pending')
         OR full_name LIKE '%dummy%'
         OR email LIKE '%dummy%'
         OR email LIKE '%test%'
    `);

    execute(`
      DELETE FROM users
      WHERE role = 'student'
        AND (full_name LIKE '%dummy%' OR email LIKE '%dummy%' OR email LIKE '%test%')
    `);

    logAudit(actor.id, actor.full_name, actor.role, 'DUMMY_STUDENTS_CLEARED', 'Purged all dummy and rejected student entries');

    res.json({
      message: 'All dummy and pending/rejected student admission entries have been cleared successfully.',
    });
  } catch (error: any) {
    console.error('[Clear Dummy Students Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to clear dummy students.' });
  }
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


