import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
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
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { userId: string; role: UserRole } | null {
  try {
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

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
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

  const user = db.prepare(`
    SELECT u.*, t.full_name as assigned_teacher_name
    FROM users u
    LEFT JOIN users t ON u.assigned_teacher_id = t.id
    WHERE u.id = ?
  `).get(verified.userId) as (User & { assigned_teacher_name?: string }) | undefined;

  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
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
    can_approve: Boolean(user.can_approve),
    can_admit: Boolean(user.can_admit),
    created_at: user.created_at,
  };

  next();
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
