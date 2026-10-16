import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit } from '../db.js';
import { authMiddleware, requireRole, hashPassword, type AuthRequest } from '../auth.js';
import type { StudentAdmission, TeacherApplication, User } from '../types.js';

export const admissionsRouter = Router();

// Public / Student / Teacher: Submit New Student Admission
admissionsRouter.post('/student', (req: AuthRequest, res: Response) => {
  const { full_name, father_name, whatsapp, email, learning_level, assigned_teacher_id, notes } = req.body;

  if (!full_name || !father_name || !whatsapp || !email) {
    res.status(400).json({ error: 'Full name, father name, WhatsApp number, and email are required.' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  const existingUser = queryOne<{ id: string; status: string }>('SELECT id, status FROM users WHERE email = ?', cleanEmail);
  const existingAdmission = queryOne<{ id: string; status: string }>('SELECT id, status FROM student_admissions WHERE email = ?', cleanEmail);

  if (existingUser || existingAdmission) {
    const isPending = existingUser?.status === 'pending' || existingAdmission?.status === 'pending';
    if (isPending) {
      res.status(400).json({
        error: 'An admission application with this Gmail address has already been submitted and is currently Pending Owner Review and Activation. Please wait for the Academy Owner to activate your account.',
      });
      return;
    }
    res.status(400).json({
      error: 'An account with this Gmail address is already registered and active. Please select "Sign In" and enter your password.',
    });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  execute(`
    INSERT INTO student_admissions (id, full_name, father_name, whatsapp, email, learning_level, assigned_teacher_id, registered_by_id, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `,
    id,
    full_name.trim(),
    father_name.trim(),
    whatsapp.trim(),
    email.toLowerCase().trim(),
    learning_level || 'Book 1',
    assigned_teacher_id || null,
    req.user?.id || null,
    notes ? notes.trim() : null,
    now
  );

  res.status(201).json({
    message: 'New Student Admission request submitted successfully! It is currently Pending Owner Review and Activation.',
    admissionId: id,
    status: 'pending',
  });
});

// Public / Teacher: Submit Become a Teacher application
admissionsRouter.post('/teacher', (req, res: Response) => {
  const { full_name, email, whatsapp, subjects, introduction, experience } = req.body;

  if (!full_name || !email || !whatsapp || !subjects || !introduction) {
    res.status(400).json({ error: 'Full name, email, WhatsApp, subjects/skills, and introduction are required.' });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  execute(`
    INSERT INTO teacher_applications (id, full_name, email, whatsapp, subjects, introduction, experience, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `,
    id,
    full_name.trim(),
    email.toLowerCase().trim(),
    whatsapp.trim(),
    subjects.trim(),
    introduction.trim(),
    experience ? experience.trim() : null,
    now
  );

  res.status(201).json({
    message: 'Teacher application submitted successfully! Your application is now Pending Owner Approval.',
    applicationId: id,
    status: 'pending',
  });
});

// Owner / Admin: List student admission requests
admissionsRouter.get('/students', authMiddleware, requireRole('owner', 'admin', 'teacher'), (req: AuthRequest, res: Response) => {
  let query = `
    SELECT sa.*, t.full_name as teacher_name
    FROM student_admissions sa
    LEFT JOIN users t ON sa.assigned_teacher_id = t.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  // If teacher, show only requests where assigned to them or registered by them
  if (req.user?.role === 'teacher') {
    query += ' AND (sa.assigned_teacher_id = ? OR sa.registered_by_id = ?)';
    params.push(req.user.id, req.user.id);
  }

  query += ' ORDER BY sa.created_at DESC';

  const admissions = queryAll<StudentAdmission>(query, ...params);
  res.json({ admissions });
});

// Owner: Approve student admission & activate user
admissionsRouter.post('/students/:id/approve', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const admission = queryOne<StudentAdmission>('SELECT * FROM student_admissions WHERE id = ?', req.params.id);
  if (!admission) {
    res.status(404).json({ error: 'Admission request not found.' });
    return;
  }

  const now = new Date().toISOString();

  // Check if a user already exists for this email
  const existingUser = queryOne<User>('SELECT * FROM users WHERE email = ?', admission.email);

  if (existingUser) {
    execute(`
      UPDATE users
      SET status = 'active',
          assigned_teacher_id = coalesce(?, assigned_teacher_id),
          updated_at = ?
      WHERE id = ?
    `, admission.assigned_teacher_id || null, now, existingUser.id);
  } else {
    // Generate temporary initial password if student was registered by admin
    const defaultPassword = 'acclStudent@2026';
    const { salt, hash } = hashPassword(defaultPassword);
    const userId = crypto.randomUUID();

    execute(`
      INSERT INTO users (id, email, password_hash, salt, full_name, father_name, whatsapp, role, status, learning_level, assigned_teacher_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'active', ?, ?, ?, ?)
    `,
      userId,
      admission.email,
      hash,
      salt,
      admission.full_name,
      admission.father_name,
      admission.whatsapp,
      admission.learning_level,
      admission.assigned_teacher_id || null,
      now,
      now
    );
  }

  // Update admission status
  execute(`
    UPDATE student_admissions
    SET status = 'approved', reviewed_at = ?
    WHERE id = ?
  `, now, req.params.id);

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'STUDENT_ADMISSION_APPROVED', `Approved admission for ${admission.full_name} (${admission.email})`);
  }

  res.json({ message: `Student admission approved! Student account for ${admission.full_name} is now Active.` });
});

// Owner: Reject student admission
admissionsRouter.post('/students/:id/reject', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const admission = queryOne<StudentAdmission>('SELECT * FROM student_admissions WHERE id = ?', req.params.id);
  if (!admission) {
    res.status(404).json({ error: 'Admission request not found.' });
    return;
  }
  const now = new Date().toISOString();
  execute(`
    UPDATE student_admissions
    SET status = 'rejected', reviewed_at = ?
    WHERE id = ?
  `, now, req.params.id);

  // Mark associated pending user account as suspended so they cannot login
  execute(`
    UPDATE users
    SET status = 'suspended', updated_at = ?
    WHERE email = ? AND status = 'pending'
  `, now, admission.email);

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'STUDENT_ADMISSION_REJECTED', `Rejected admission for ${admission.full_name} (${admission.email})`);
  }

  res.json({ message: 'Student admission rejected.' });
});

// Owner: Delete student admission permanently
admissionsRouter.delete('/students/:id', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const admission = queryOne<StudentAdmission>('SELECT * FROM student_admissions WHERE id = ?', req.params.id);
  if (!admission) {
    res.status(404).json({ error: 'Admission request not found.' });
    return;
  }

  // Delete admission
  execute('DELETE FROM student_admissions WHERE id = ?', req.params.id);

  // If associated user is a student (not owner or admin), remove user account
  execute("DELETE FROM users WHERE email = ? AND role = 'student'", admission.email);

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'STUDENT_ADMISSION_DELETED', `Deleted admission for ${admission.full_name} (${admission.email})`);
  }

  res.json({ message: `Admission for ${admission.full_name} has been permanently deleted.` });
});

// Owner: Clean all student admissions
admissionsRouter.post('/students/clean-all', authMiddleware, requireRole('owner'), (_req: AuthRequest, res: Response) => {
  execute('DELETE FROM student_admissions');
  execute("DELETE FROM users WHERE role = 'student'");
  res.json({ message: 'All student admission records have been cleaned.' });
});


// Owner: List teacher applications
admissionsRouter.get('/teachers', authMiddleware, requireRole('owner', 'admin'), (_req, res: Response) => {
  const applications = queryAll<TeacherApplication>(`
    SELECT * FROM teacher_applications
    ORDER BY created_at DESC
  `);
  res.json({ applications });
});

// Owner: Approve teacher application & create teacher account
admissionsRouter.post('/teachers/:id/approve', authMiddleware, requireRole('owner'), (req: AuthRequest, res: Response) => {
  const { can_approve, can_admit, initial_password } = req.body;
  const application = queryOne<TeacherApplication>('SELECT * FROM teacher_applications WHERE id = ?', req.params.id);
  if (!application) {
    res.status(404).json({ error: 'Teacher application not found.' });
    return;
  }

  const now = new Date().toISOString();
  const password = initial_password || 'teacher@accl2026';
  const { salt, hash } = hashPassword(password);

  // Check if user exists
  const existingUser = queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', application.email);
  let teacherId = '';

  if (existingUser) {
    teacherId = existingUser.id;
    execute(`
      UPDATE users
      SET role = 'teacher',
          status = 'active',
          can_approve = ?,
          can_admit = ?,
          updated_at = ?
      WHERE id = ?
    `, can_approve ? 1 : 0, can_admit ? 1 : 0, now, teacherId);
  } else {
    teacherId = crypto.randomUUID();
    execute(`
      INSERT INTO users (id, email, password_hash, salt, full_name, whatsapp, role, status, learning_level, can_approve, can_admit, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'teacher', 'active', 'Book 1', ?, ?, ?, ?)
    `,
      teacherId,
      application.email,
      hash,
      salt,
      application.full_name,
      application.whatsapp,
      can_approve ? 1 : 0,
      can_admit ? 1 : 0,
      now,
      now
    );
  }

  execute(`
    UPDATE teacher_applications
    SET status = 'approved', reviewed_at = ?
    WHERE id = ?
  `, now, req.params.id);

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'TEACHER_APPROVED', `Approved teacher application for ${application.full_name} (${application.email})`);
  }

  res.json({
    message: `Teacher ${application.full_name} approved successfully! Login credentials activated.`,
    temporaryPassword: password,
  });
});

// Owner: Reject teacher application
admissionsRouter.post('/teachers/:id/reject', authMiddleware, requireRole('owner'), (_req, res: Response) => {
  const now = new Date().toISOString();
  execute(`
    UPDATE teacher_applications
    SET status = 'rejected', reviewed_at = ?
    WHERE id = ?
  `, now, _req.params.id);

  res.json({ message: 'Teacher application rejected.' });
});
