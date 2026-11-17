import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit, findUserByEmailOrAlias, getStudentIdAliases } from '../db.js';
import { authMiddleware, requireRole, type AuthRequest, hashPassword } from '../auth.js';
import type { User } from '../types.js';

export const usersRouter = Router();

// List all teachers (for dropdowns / assignment / teacher tabs)
const listTeachersHandler = (_req: any, res: Response) => {
  const teachers = queryAll(`
    SELECT id, full_name, email, whatsapp, role, can_approve, can_admit
    FROM users
    WHERE role IN ('teacher', 'owner', 'admin') AND status = 'active'
    ORDER BY full_name ASC
  `);
  res.json({ teachers });
};

usersRouter.get('/teachers-list', authMiddleware, listTeachersHandler);
usersRouter.get('/teachers', authMiddleware, listTeachersHandler);

// Owner/Admin/Teacher: List users (Teachers see ONLY their registered/assigned students)
usersRouter.get('/', authMiddleware, requireRole('owner', 'admin', 'teacher'), (req: AuthRequest, res: Response) => {
  const { role, status, search } = req.query;
  const currentUser = req.user!;

  let query = `
    SELECT u.id, u.email, u.full_name, u.father_name, u.whatsapp, u.role, u.status,
           u.learning_level, u.assigned_teacher_id, u.registered_by_id, u.can_approve, u.can_admit, u.created_at,
           t.full_name as assigned_teacher_name
    FROM users u
    LEFT JOIN users t ON u.assigned_teacher_id = t.id
    WHERE u.id != 'student'
  `;
  const params: any[] = [];

  // Scoping: If user is teacher, they see ONLY assigned or registered-by students!
  if (currentUser.role === 'teacher') {
    query += " AND u.role = 'student' AND (u.assigned_teacher_id = ? OR u.registered_by_id = ?)";
    params.push(currentUser.id, currentUser.id);
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
      registered_by_id: r.registered_by_id || null,
      can_approve: Boolean(r.can_approve),
      can_admit: Boolean(r.can_admit),
      created_at: r.created_at,
    })),
  });
});

// Owner/Admin (and Teacher for own students): Update user role / status / permissions / teacher assignment
usersRouter.put('/:id', authMiddleware, requireRole('owner', 'admin', 'teacher'), (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  const actor = req.user!;
  const { full_name, father_name, whatsapp, role, status, assigned_teacher_id, can_approve, can_admit, learning_level, password } = req.body;

  const target = queryOne<User>('SELECT * FROM users WHERE id = ?', targetId);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Teachers may only update their own students' basic fields/status
  if (actor.role === 'teacher') {
    if (target.role !== 'student' || (target.assigned_teacher_id !== actor.id && target.registered_by_id !== actor.id)) {
      res.status(403).json({ error: 'Teachers can only manage students assigned to or registered by them.' });
      return;
    }
    if (role || can_approve !== undefined || can_admit !== undefined || assigned_teacher_id !== undefined) {
      res.status(403).json({ error: 'Teachers cannot modify roles or system permissions.' });
      return;
    }
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
        assigned_teacher_id = ?,
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
    assigned_teacher_id !== undefined ? (assigned_teacher_id || null) : target.assigned_teacher_id || null,
    can_approve !== undefined ? (can_approve ? 1 : 0) : null,
    can_admit !== undefined ? (can_admit ? 1 : 0) : null,
    learning_level || null,
    now,
    targetId
  );

  if (password && String(password).trim().length >= 6 && (actor.role === 'owner' || actor.role === 'admin')) {
    const { salt, hash } = hashPassword(String(password).trim());
    execute('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?', hash, salt, now, targetId);
  }

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


// Owner/Admin/Teacher: Direct Student Registration (Name, WhatsApp, Gmail)
usersRouter.post('/register-student', authMiddleware, requireRole('owner', 'admin', 'teacher'), (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { full_name, whatsapp, email, learning_level, assigned_teacher_id } = req.body || {};

    if (!full_name || !whatsapp || !email) {
      res.status(400).json({ error: 'Student Name, WhatsApp Number, and Gmail Address are required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = String(full_name).trim();
    const cleanWa = String(whatsapp).trim();

    // Teachers always register students into their own portal
    const effectiveTeacherId = actor.role === 'teacher' ? actor.id : (assigned_teacher_id || null);
    const registeredById = actor.id;

    // Check duplicate email
    const existing = findUserByEmailOrAlias<User>(cleanEmail);
    if (existing) {
      if (existing.role === 'student') {
        if (
          actor.role === 'teacher' &&
          existing.assigned_teacher_id &&
          existing.assigned_teacher_id !== actor.id &&
          existing.registered_by_id !== actor.id
        ) {
          res.status(400).json({ error: `Student "${existing.full_name}" (${cleanEmail}) is already registered under another teacher.` });
          return;
        }

        const nextTeacherId = effectiveTeacherId || existing.assigned_teacher_id || null;
        const nextRegById = existing.registered_by_id || registeredById;

        execute(`
          UPDATE users
          SET full_name = ?, whatsapp = ?, status = 'active', learning_level = ?,
              assigned_teacher_id = ?, registered_by_id = ?, updated_at = ?
          WHERE id = ?
        `, cleanName, cleanWa, learning_level || 'Book 1', nextTeacherId, nextRegById, new Date().toISOString(), existing.id);

        execute(`
          UPDATE student_admissions
          SET full_name = ?, whatsapp = ?, status = 'approved', assigned_teacher_id = ?, reviewed_at = ?
          WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
        `, cleanName, cleanWa, nextTeacherId, new Date().toISOString(), cleanEmail);

        res.status(200).json({
          message: `Student "${cleanName}" was updated and activated successfully! They can now sign in with ${cleanEmail}.`,
          student: {
            id: existing.id,
            full_name: cleanName,
            email: existing.email || cleanEmail,
            whatsapp: cleanWa,
            role: 'student',
            status: 'active',
            learning_level: learning_level || 'Book 1',
            assigned_teacher_id: nextTeacherId,
            registered_by_id: nextRegById,
            created_at: existing.created_at,
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
        role, status, learning_level, assigned_teacher_id, registered_by_id, can_approve, can_admit, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'active', ?, ?, ?, 0, 0, ?, ?)
    `,
      id,
      cleanEmail,
      hash,
      salt,
      cleanName,
      null,
      cleanWa,
      level,
      effectiveTeacherId,
      registeredById,
      now,
      now
    );

    // Also insert or update record into student_admissions with status 'approved'
    const admId = crypto.randomUUID();
    execute(`
      INSERT OR REPLACE INTO student_admissions (id, full_name, father_name, whatsapp, email, learning_level, assigned_teacher_id, registered_by_id, notes, status, created_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
    `,
      admId,
      cleanName,
      'N/A',
      cleanWa,
      cleanEmail,
      level,
      effectiveTeacherId,
      registeredById,
      `Registered directly by ${actor.role} (${actor.full_name}) for passwordless Gmail Sign-In`,
      now,
      now
    );

    logAudit(actor.id, actor.full_name, actor.role, 'STUDENT_REGISTERED', `${actor.role} registered student: ${cleanName} (${cleanEmail}, WA: ${cleanWa})`);

    res.status(201).json({
      message: `Student "${cleanName}" registered successfully! They can now sign in with Gmail: ${cleanEmail}.`,
      student: {
        id,
        full_name: cleanName,
        email: cleanEmail,
        whatsapp: cleanWa,
        role: 'student',
        status: 'active',
        learning_level: level,
        assigned_teacher_id: effectiveTeacherId,
        registered_by_id: registeredById,
        created_at: now,
      },
    });
  } catch (error: any) {
    console.error('[Register Student Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to register student.' });
  }
});

// Owner/Admin/Teacher: Get students with comprehensive progress reports & submissions overview
usersRouter.get('/students-overview', authMiddleware, requireRole('owner', 'admin', 'teacher'), (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    let filterClause = " AND u.id != 'student'";
    const params: any[] = [];

    if (actor.role === 'teacher') {
      filterClause += ' AND (u.assigned_teacher_id = ? OR u.registered_by_id = ?)';
      params.push(actor.id, actor.id);
    }

    const totalBook1 = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE book = 'Book 1' AND status = 'active'")?.count || 180;

    const userRows = queryAll<any>(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.whatsapp, 
        u.status, 
        u.learning_level,
        u.assigned_teacher_id,
        u.registered_by_id,
        t.full_name as assigned_teacher_name,
        u.created_at
      FROM users u
      LEFT JOIN users t ON u.assigned_teacher_id = t.id
      WHERE u.role = 'student' ${filterClause}
      ORDER BY u.created_at DESC
    `, ...params);

    const allSubs = queryAll<any>('SELECT id, student_id, status, updated_at, submitted_at FROM submissions');
    const allAttendance = queryAll<any>('SELECT id, student_id, date_key, duration_minutes, status, check_in_local FROM attendance_sessions');

    const students = userRows.map((r) => {
      const aliases = getStudentIdAliases(r.id);
      if (r.email?.toLowerCase().includes('farukharain52')) aliases.push('student');
      if (r.email?.toLowerCase().includes('mateen')) aliases.push('0e5e0061-f2ac-4ff6-8085-4d6d575938b9', 'std_1793115797698_qvwb');

      const studentSubs = allSubs.filter((s) => aliases.includes(String(s.student_id)));
      const approved = studentSubs.filter((s) => s.status === 'approved').length;
      const pending = studentSubs.filter((s) => s.status === 'submitted').length;
      const rejected = studentSubs.filter((s) => s.status === 'needs_correction' || s.status === 'rejected').length;
      const lastSubAt = studentSubs.reduce((latest: string | null, s: any) => {
        const ts = s.updated_at || s.submitted_at;
        if (!ts) return latest;
        return !latest || ts > latest ? ts : latest;
      }, null);

      const studentAtt = allAttendance.filter((a) => aliases.includes(String(a.student_id)));
      const attDays = new Set(studentAtt.map((a) => a.date_key).filter(Boolean)).size;
      const attMins = studentAtt.reduce((sum, a) => sum + Number(a.duration_minutes || 0), 0);
      const isCheckedIn = studentAtt.some((a) => a.status === 'active');
      const lastCheckInLocal = studentAtt[0]?.check_in_local || null;

      const progressPercent = totalBook1 > 0 ? Math.min(100, Math.round((approved / totalBook1) * 100)) : 0;

      return {
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        whatsapp: r.whatsapp,
        status: r.status,
        learning_level: r.learning_level || 'Book 1',
        assigned_teacher_id: r.assigned_teacher_id || null,
        assigned_teacher_name: r.assigned_teacher_name || null,
        registered_by_id: r.registered_by_id || null,
        created_at: r.created_at,
        total_submissions: studentSubs.length,
        approved_count: approved,
        pending_count: pending,
        rejected_count: rejected,
        progress_percent: progressPercent,
        last_submission_at: lastSubAt,
        attendance_days: attDays,
        attendance_minutes: attMins,
        attendance_hours: (attMins / 60).toFixed(1),
        is_checked_in: isCheckedIn,
        last_check_in_local: lastCheckInLocal,
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

    const existing = findUserByEmailOrAlias<User>(cleanEmail);
    if (existing) {
      res.status(400).json({ error: `A user with email "${cleanEmail}" already exists in the system.` });
      return;
    }

    const teacherPassword = password && String(password).trim() ? String(password).trim() : 'teacher@accl2026';
    const { salt, hash } = hashPassword(teacherPassword);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    execute(`
      INSERT INTO users (
        id, email, password_hash, salt, full_name, whatsapp,
        role, status, learning_level, registered_by_id, can_approve, can_admit, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'teacher', 'active', 'Book 1', ?, ?, 0, ?, ?)
    `,
      id,
      cleanEmail,
      hash,
      salt,
      cleanName,
      cleanWa,
      actor.id,
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
      message: `Teacher "${cleanName}" registered successfully! Login Password: ${teacherPassword}`,
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

// Owner: Clear all student records so owner can register real students fresh
usersRouter.post('/clear-all-students', authMiddleware, requireRole('owner'), (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    execute("DELETE FROM users WHERE role = 'student'");
    execute("DELETE FROM student_admissions");
    execute("DELETE FROM submissions");
    execute("DELETE FROM submission_history");
    execute("DELETE FROM attendance_sessions");

    logAudit(actor.id, actor.full_name, actor.role, 'ALL_STUDENTS_CLEARED', 'Owner reset student portal to add real students fresh');

    res.json({
      message: 'All student accounts, task submissions, and admissions have been cleared. You can now register your real students fresh!',
    });
  } catch (error: any) {
    console.error('[Clear All Students Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to clear student accounts.' });
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


