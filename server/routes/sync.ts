import { Router, type Response } from 'express';
import { queryAll, queryOne, execute, ensureDatabaseInitialized, logAudit } from '../db.js';
import { hashPassword } from '../auth.js';
import type { StudentAdmission, User } from '../types.js';

export const syncRouter = Router();

/**
 * Bidirectional Database Synchronization Endpoint
 * Ensures all student admissions, approvals, and user accounts are permanently
 * preserved across serverless container restarts and client devices.
 */
syncRouter.post('/', (req, res: Response) => {
  try {
    ensureDatabaseInitialized();
    const { clientAdmissions, clientUsers } = req.body || {};
    const now = new Date().toISOString();

    // 1. Sync Student Admissions from client
    if (Array.isArray(clientAdmissions) && clientAdmissions.length > 0) {
      for (const adm of clientAdmissions) {
        if (!adm.email) continue;
        const cleanEmail = String(adm.email).toLowerCase().trim();
        const existing = queryOne<StudentAdmission>(
          'SELECT * FROM student_admissions WHERE id = ? OR email = ?',
          adm.id,
          cleanEmail
        );

        if (!existing) {
          execute(`
            INSERT INTO student_admissions (
              id, full_name, father_name, whatsapp, email, learning_level,
              assigned_teacher_id, registered_by_id, notes, status, created_at, reviewed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            adm.id,
            adm.full_name || 'Student',
            adm.father_name || 'N/A',
            adm.whatsapp || 'N/A',
            cleanEmail,
            adm.learning_level || 'Book 1',
            adm.assigned_teacher_id || null,
            adm.registered_by_id || null,
            adm.notes || null,
            adm.status === 'approved' ? 'approved' : 'pending',
            adm.created_at || now,
            adm.reviewed_at || null
          );
        }
      }
    }

    // 2. Sync Users from client
    if (Array.isArray(clientUsers) && clientUsers.length > 0) {
      for (const u of clientUsers) {
        if (!u.email) continue;
        const cleanEmail = String(u.email).toLowerCase().trim();
        const existing = queryOne<User>('SELECT * FROM users WHERE email = ?', cleanEmail);

        if (!existing) {
          const defaultPassword = u.password || '@Farukh2199';
          const { salt, hash } = hashPassword(defaultPassword);

          execute(`
            INSERT INTO users (
              id, email, password_hash, salt, full_name, father_name, whatsapp,
              role, status, learning_level, assigned_teacher_id, can_approve, can_admit, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            u.id,
            cleanEmail,
            u.password_hash || hash,
            u.salt || salt,
            u.full_name || 'Student',
            u.father_name || null,
            u.whatsapp || null,
            u.role || 'student',
            u.status || 'pending',
            u.learning_level || 'Book 1',
            u.assigned_teacher_id || null,
            u.can_approve ? 1 : 0,
            u.can_admit ? 1 : 0,
            u.created_at || now,
            u.updated_at || now
          );
        } else if (u.status === 'active' && existing.status !== 'active') {
          execute('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', 'active', now, existing.id);
        }
      }
    }

    // 3. Return full authoritative dataset to client
    const serverAdmissions = queryAll<StudentAdmission>('SELECT * FROM student_admissions ORDER BY created_at DESC');
    const serverUsers = queryAll<User>('SELECT id, email, full_name, father_name, whatsapp, role, status, learning_level, assigned_teacher_id, can_approve, can_admit, created_at FROM users ORDER BY created_at DESC');

    res.json({
      success: true,
      message: 'Database synchronized and permanently preserved.',
      admissions: serverAdmissions,
      users: serverUsers,
    });
  } catch (error: any) {
    console.error('[Sync Route Error]:', error);
    res.status(500).json({ error: error.message || 'Sync failed.' });
  }
});
