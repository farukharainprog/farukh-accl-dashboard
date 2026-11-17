import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db, findUserByEmailOrAlias, ensureUserInSqlite, ensureDatabaseInitialized } from './db.js';
import { fetchFirestoreUserById } from './firestoreClient.js';
import type { User, UserRole, UserProfile } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'accl-farukh-businessman-wala-secret-key-2026';

export interface AuthRequest extends Request {
  user?: UserProfile;
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    if (!password || !salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const verifyBuf = Buffer.from(verifyHash, 'hex');
    if (hashBuf.length !== verifyBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, verifyBuf);
  } catch {
    return false;
  }
}

export function createToken(userId: string, role: UserRole): string {
  const payload = {
    userId,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 90, // 90 days for permanent sessions on laptop
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { userId: string; role: UserRole } | null {
  try {
    if (!token) return null;

    // Check if token is in token-<userId>-<timestamp> fallback format
    if (token.startsWith('token-')) {
      const parts = token.split('-');
      if (parts.length >= 3) {
        const userId = parts.slice(1, parts.length - 1).join('-');
        const u = (db.prepare('SELECT id, role FROM users WHERE id = ? OR LOWER(TRIM(email)) = LOWER(TRIM(?))').get(userId, userId) as { id: string; role: UserRole } | undefined)
          || findUserByEmailOrAlias<{ id: string; role: UserRole }>(userId);
        if (u) {
          return { userId: u.id, role: u.role };
        }
        return { userId, role: 'student' };
      }
    }

    // Check if token is in fs_token_<userIdOrEmail>_<timestamp> format
    if (token.startsWith('fs_token_')) {
      const parts = token.split('_');
      if (parts.length >= 3) {
        const identifier = parts.slice(2, parts.length - 1).join('_');
        const cleanIdent = identifier.toLowerCase().trim();
        const u = (db.prepare('SELECT id, role FROM users WHERE id = ? OR LOWER(TRIM(email)) = ?').get(identifier, cleanIdent) as { id: string; role: UserRole } | undefined)
          || findUserByEmailOrAlias<{ id: string; role: UserRole }>(cleanIdent);
        if (u) {
          return { userId: u.id, role: u.role };
        }
        return { userId: identifier, role: 'student' };
      }
    }

    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) return null;

    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    ensureDatabaseInitialized();
    const authHeader = req.headers.authorization || req.headers['x-auth-token'];
    let token = '';

    if (typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    const verified = verifyToken(token);
    if (!verified) {
      res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
      return;
    }

    let user = (db.prepare(`
      SELECT u.*, t.full_name as assigned_teacher_name
      FROM users u
      LEFT JOIN users t ON u.assigned_teacher_id = t.id
      WHERE u.id = ? OR LOWER(TRIM(u.email)) = LOWER(TRIM(?))
    `).get(verified.userId, verified.userId) as (User & { assigned_teacher_name?: string }) | undefined)
      || (verified.userId.includes('@') ? findUserByEmailOrAlias<User & { assigned_teacher_name?: string }>(verified.userId) : undefined);

    if (!user) {
      // Hydrate from Firestore if available (prevents FK crash and restores teacher/student role & scoping)
      const fsUser = await fetchFirestoreUserById(verified.userId);
      if (fsUser) {
        ensureUserInSqlite(fsUser);
        user = db.prepare(`
          SELECT u.*, t.full_name as assigned_teacher_name
          FROM users u
          LEFT JOIN users t ON u.assigned_teacher_id = t.id
          WHERE u.id = ? OR LOWER(TRIM(u.email)) = LOWER(TRIM(?))
        `).get(fsUser.id || verified.userId, fsUser.email || verified.userId) as (User & { assigned_teacher_name?: string }) | undefined;
      }
    }

    if (!user) {
      // Ensure non-owner verified fallback session exists in SQLite users table to satisfy foreign keys
      const fallbackRole: UserRole = verified.role === 'teacher' || verified.role === 'admin' ? verified.role : 'student';
      const fallbackEmail = verified.userId.includes('@') ? verified.userId.toLowerCase().trim() : `${verified.userId}@accl.student`;
      const created = ensureUserInSqlite({
        id: verified.userId,
        email: fallbackEmail,
        full_name: 'Student',
        role: fallbackRole,
        status: 'active',
        learning_level: 'Book 1',
      });
      req.user = {
        id: created?.id || verified.userId,
        email: created?.email || fallbackEmail,
        full_name: created?.full_name || 'Student',
        father_name: created?.father_name || null,
        whatsapp: created?.whatsapp || null,
        role: (created?.role as UserRole) || fallbackRole,
        status: created?.status || 'active',
        learning_level: created?.learning_level || 'Book 1',
        assigned_teacher_id: created?.assigned_teacher_id || null,
        registered_by_id: created?.registered_by_id || null,
        can_approve: Boolean(created?.can_approve),
        can_admit: Boolean(created?.can_admit),
        created_at: created?.created_at || new Date().toISOString(),
      };
      next();
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended by the academy administration.' });
      return;
    }

    req.user = {
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
      registered_by_id: user.registered_by_id || null,
      can_approve: Boolean(user.can_approve),
      can_admit: Boolean(user.can_admit),
      created_at: user.created_at,
    };

    next();
  } catch (err) {
    console.error('[AuthMiddleware Error]:', err);
    res.status(401).json({ error: 'Authentication verification failed.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Requires one of: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

export function requireActive(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.status !== 'active') {
    res.status(403).json({
      error: 'Account Pending Activation. The Academy Owner must review and activate your student account before you can access the dashboard.',
      status: req.user.status,
    });
    return;
  }
  next();
}
