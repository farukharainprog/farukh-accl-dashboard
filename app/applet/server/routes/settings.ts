import { Router, type Response } from 'express';
import { db, getSetting, setSetting, logAudit, getKarachiDateKey, getKarachiTimeString } from '../db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../auth.js';

export const settingsRouter = Router();

// GET /api/settings: Public settings for branding and WhatsApp links
settingsRouter.get('/', (_req, res: Response) => {
  res.json({
    dashboard_title: getSetting('dashboard_title', 'Farukh Businessman Wala ACCL Dashboard'),
    academy_name: getSetting('academy_name', 'Rehan School Tuition Academy'),
    footer_credit: getSetting('footer_credit', 'Created by FARUKH BUSINESSMAN WALA'),
    whatsapp_primary: getSetting('whatsapp_primary', '0345 3967083'),
    whatsapp_second: getSetting('whatsapp_second', '03421336388'),
    whatsapp_primary_link: getSetting('whatsapp_primary_link', 'https://wa.me/923453967083'),
    whatsapp_second_link: getSetting('whatsapp_second_link', 'https://wa.me/923421336388'),
    academy_timezone: getSetting('academy_timezone', 'Asia/Karachi'),
    logo_url: getSetting('logo_url', ''),
    require_student_approval: getSetting('require_student_approval', 'true') === 'true',
    require_teacher_approval: getSetting('require_teacher_approval', 'true') === 'true',
    currentTimePST: getKarachiTimeString(),
  });
});

// Owner: Update academy settings
settingsRouter.put('/', authMiddleware, requireRole('owner'), (req: AuthRequest, res: Response) => {
  const settingsToUpdate = req.body;

  const allowedKeys = [
    'dashboard_title',
    'academy_name',
    'footer_credit',
    'whatsapp_primary',
    'whatsapp_second',
    'whatsapp_primary_link',
    'whatsapp_second_link',
    'logo_url',
    'require_student_approval',
    'require_teacher_approval',
  ];

  for (const key of allowedKeys) {
    if (settingsToUpdate[key] !== undefined) {
      setSetting(key, String(settingsToUpdate[key]));
    }
  }

  if (req.user) {
    logAudit(req.user.id, req.user.full_name, req.user.role, 'SETTINGS_UPDATED', 'Updated academy settings and branding');
  }

  res.json({ message: 'Academy settings updated successfully.' });
});

// Owner/Admin: Overview metrics for management dashboard
settingsRouter.get('/admin-stats', authMiddleware, requireRole('owner', 'admin'), (_req, res: Response) => {
  const totalStudents = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student' AND status = 'active'").get() as { c: number }).c;
  const pendingStudents = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student' AND status = 'pending'").get() as { c: number }).c;
  const totalTeachers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'teacher' AND status = 'active'").get() as { c: number }).c;
  const pendingTeachers = (db.prepare("SELECT COUNT(*) as c FROM teacher_applications WHERE status = 'pending'").get() as { c: number }).c;
  const pendingAdmissions = (db.prepare("SELECT COUNT(*) as c FROM student_admissions WHERE status = 'pending'").get() as { c: number }).c;

  const totalTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'active'").get() as { c: number }).c;
  const pendingSubmissions = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE status = 'submitted'").get() as { c: number }).c;
  const approvedSubmissions = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE status = 'approved'").get() as { c: number }).c;
  const needsCorrectionSubmissions = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE status IN ('needs_correction', 'rejected')").get() as { c: number }).c;

  const todayKey = getKarachiDateKey();
  const todayCheckins = (db.prepare("SELECT COUNT(*) as c FROM attendance_sessions WHERE date_key = ?").get(todayKey) as { c: number }).c;
  const activeNow = (db.prepare("SELECT COUNT(*) as c FROM attendance_sessions WHERE status = 'active'").get() as { c: number }).c;

  res.json({
    totalStudents,
    pendingStudents,
    totalTeachers,
    pendingTeachers,
    pendingAdmissions,
    totalTasks,
    pendingSubmissions,
    approvedSubmissions,
    needsCorrectionSubmissions,
    todayCheckins,
    activeNow,
    todayKey,
    currentTime: getKarachiTimeString(),
  });
});
