import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryOne, execute, logAudit, getSetting, ensureDatabaseInitialized } from '../db.js';
import { hashPassword, verifyPassword, createToken, authMiddleware, type AuthRequest } from '../auth.js';
import type { User } from '../types.js';

export const authRouter = Router();

// Check if any owner exists
authRouter.get('/check-owner-exists', (_req, res: Response) => {
  try {
    ensureDatabaseInitialized();
    const row = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'owner'");
    res.json({ hasOwner: Boolean(row && row.count > 0) });
  } catch (err: any) {
    console.error('[check-owner-exists error]:', err);
    res.json({ hasOwner: true });
  }
});

// Setup First Owner (Super Admin)
authRouter.post('/first-owner-setup', (req, res: Response) => {
  try {
    ensureDatabaseInitialized();
    const { full_name, email, password, whatsapp, setup_key } = req.body || {};

    if (!full_name || !email || !password) {
      res.status(400).json({ error: 'Full name, email, and password are required.' });
      return;
    }

    const ownerCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'owner'")?.count || 0;
    const envKey = process.env.FIRST_OWNER_SETUP_KEY || 'setup-owner-accl-key';

    if (ownerCount > 0 && setup_key !== envKey) {
      res.status(403).json({ error: 'An Owner already exists. First-owner setup is locked. Use valid Owner setup key to proceed.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = queryOne('SELECT id FROM users WHERE email = ?', cleanEmail);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const id = crypto.randomUUID();
    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();

    execute(`
      INSERT INTO users (id, email, password_hash, salt, full_name, whatsapp, role, status, learning_level, can_approve, can_admit, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'owner', 'active', 'Book 1', 1, 1, ?, ?)
    `, id, cleanEmail, hash, salt, String(full_name).trim(), whatsapp ? String(whatsapp).trim() : null, now, now);

    logAudit(id, String(full_name).trim(), 'owner', 'FIRST_OWNER_CREATED', `First academy owner registered: ${cleanEmail}`);

    const token = createToken(id, 'owner');
    res.status(201).json({
      message: 'Academy Owner account created successfully! You have full super admin access.',
      token,
      user: {
        id,
        email: cleanEmail,
        full_name: String(full_name).trim(),
        whatsapp: whatsapp ? String(whatsapp).trim() : null,
        role: 'owner',
        status: 'active',
        learning_level: 'Book 1',
        can_approve: true,
        can_admit: true,
        created_at: now,
      },
    });
  } catch (error: any) {
    console.error('[First Owner Setup Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to setup Owner account.' });
  }
});

// Register Student
authRouter.post('/register', (req, res: Response) => {
  try {
    ensureDatabaseInitialized();
    const { full_name, father_name, email, password, whatsapp, learning_level } = req.body || {};

    if (!full_name || !email || !password) {
      res.status(400).json({ error: 'Full name, email, and password are required.' });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = queryOne('SELECT id FROM users WHERE email = ?', cleanEmail);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const requireApproval = getSetting('require_student_approval', 'true') === 'true';
    const initialStatus = requireApproval ? 'pending' : 'active';

    const id = crypto.randomUUID();
    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();

    // 14 columns with 14 values:
    // id, email, password_hash, salt, full_name, father_name, whatsapp,
    // role ('student'), status (?), learning_level (?), can_approve (0), can_admit (0), created_at (?), updated_at (?)
    execute(`
      INSERT INTO users (
        id, email, password_hash, salt, full_name, father_name, whatsapp,
        role, status, learning_level, can_approve, can_admit, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'student', ?, ?, 0, 0, ?, ?)
    `,
      id,
      cleanEmail,
      hash,
      salt,
      String(full_name).trim(),
      father_name ? String(father_name).trim() : null,
      whatsapp ? String(whatsapp).trim() : null,
      initialStatus,
      learning_level || 'Book 1',
      now,
      now
    );

    // Also log admission request
    const admissionId = crypto.randomUUID();
    execute(`
      INSERT INTO student_admissions (id, full_name, father_name, whatsapp, email, learning_level, registered_by_id, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      admissionId,
      String(full_name).trim(),
      father_name ? String(father_name).trim() : 'N/A',
      whatsapp ? String(whatsapp).trim() : 'N/A',
      cleanEmail,
      learning_level || 'Book 1',
      id,
      'Self-registered student account',
      initialStatus,
      now
    );

    logAudit(id, String(full_name).trim(), 'student', 'STUDENT_REGISTERED', `Student registered with status: ${initialStatus}`);

    const token = createToken(id, 'student');

    res.status(201).json({
      message: requireApproval
        ? 'Registration submitted! Your account is currently Pending Activation. The Academy Owner will review and activate your account.'
        : 'Registration successful! Welcome to the Academy.',
      token,
      user: {
        id,
        email: cleanEmail,
        full_name: String(full_name).trim(),
        father_name: father_name ? String(father_name).trim() : null,
        whatsapp: whatsapp ? String(whatsapp).trim() : null,
        role: 'student',
        status: initialStatus,
        learning_level: learning_level || 'Book 1',
        can_approve: false,
        can_admit: false,
        created_at: now,
      },
      requiresActivation: requireApproval,
    });
  } catch (error: any) {
    console.error('[Student Registration Error]:', error);
    res.status(500).json({ error: error.message || 'Registration failed due to a server error.' });
  }
});

// Login
authRouter.post('/login', (req, res: Response) => {
  try {
    ensureDatabaseInitialized();
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = queryOne<User & { assigned_teacher_name?: string }>(`
      SELECT u.*, t.full_name as assigned_teacher_name
      FROM users u
      LEFT JOIN users t ON u.assigned_teacher_id = t.id
      WHERE u.email = ?
    `, cleanEmail);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValid = verifyPassword(String(password), user.salt, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account is suspended. Please contact the academy administration.' });
      return;
    }

    const token = createToken(user.id, user.role);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        father_name: user.father_name,
        whatsapp: user.whatsapp,
        role: user.role,
        status: user.status,
        learning_level: user.learning_level || 'Book 1',
        assigned_teacher_id: user.assigned_teacher_id,
        assigned_teacher_name: user.assigned_teacher_name,
        can_approve: Boolean(user.can_approve),
        can_admit: Boolean(user.can_admit),
        created_at: user.created_at,
      },
      isPending: user.status === 'pending',
    });
  } catch (error: any) {
    console.error('[Login Error]:', error);
    res.status(500).json({ error: error.message || 'Login failed due to a server error.' });
  }
});

// Get current profile
authRouter.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    res.json({ user: req.user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user profile.' });
  }
});

// Update profile
authRouter.put('/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { full_name, father_name, whatsapp, password } = req.body || {};
    const now = new Date().toISOString();

    if (password && String(password).trim().length >= 6) {
      const { salt, hash } = hashPassword(String(password).trim());
      execute(`
        UPDATE users
        SET full_name = coalesce(?, full_name),
            father_name = coalesce(?, father_name),
            whatsapp = coalesce(?, whatsapp),
            password_hash = ?,
            salt = ?,
            updated_at = ?
        WHERE id = ?
      `, full_name?.trim() || null, father_name?.trim() || null, whatsapp?.trim() || null, hash, salt, now, req.user.id);
    } else {
      execute(`
        UPDATE users
        SET full_name = coalesce(?, full_name),
            father_name = coalesce(?, father_name),
            whatsapp = coalesce(?, whatsapp),
            updated_at = ?
        WHERE id = ?
      `, full_name?.trim() || null, father_name?.trim() || null, whatsapp?.trim() || null, now, req.user.id);
    }

    logAudit(req.user.id, req.user.full_name, req.user.role, 'PROFILE_UPDATED', 'User updated profile details');

    const updated = queryOne<User>('SELECT * FROM users WHERE id = ?', req.user.id);
    if (!updated) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        father_name: updated.father_name,
        whatsapp: updated.whatsapp,
        role: updated.role,
        status: updated.status,
        learning_level: updated.learning_level,
        can_approve: Boolean(updated.can_approve),
        can_admit: Boolean(updated.can_admit),
        created_at: updated.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Update Profile Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});
