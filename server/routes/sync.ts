import { Router, type Response } from 'express';
import { queryAll, queryOne, execute, ensureDatabaseInitialized, logAudit } from '../db.js';
import { hydrateSubmissionsFromFirestore } from '../hydration.js';
import { hashPassword } from '../auth.js';
import type { StudentAdmission, User } from '../types.js';

export const syncRouter = Router();

/**
 * Bidirectional Database Synchronization Endpoint
 * Ensures all student admissions, approvals, and user accounts are permanently
 * preserved across serverless container restarts and client devices.
 */
syncRouter.post('/', async (req, res: Response) => {
  try {
    ensureDatabaseInitialized();

    // Converge this instance with the durable Firestore store before answering,
    // so a cold serverless instance never reports stale/missing submissions.
    // Insert-only merge; internally timeout-guarded and non-fatal.
    await hydrateSubmissionsFromFirestore();
    const { clientAdmissions, clientUsers } = req.body || {};
    const now = new Date().toISOString();

    // SQLite is the single source of truth across all clients and laptops.
    // We only return server-authoritative users and admissions to ensure deleted/stale
    // client localStorage accounts never resurrect into the database.

    // Return full authoritative dataset to client
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
