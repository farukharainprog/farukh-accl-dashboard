import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, execute, logAudit } from '../db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../auth.js';
import type { StudentFeedback } from '../types.js';

export const feedbackRouter = Router();

// Submit feedback
feedbackRouter.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { category, rating, comment } = req.body;
  if (!comment || !category) {
    res.status(400).json({ error: 'Category and feedback comment are required.' });
    return;
  }

  const numRating = Math.min(5, Math.max(1, Number(rating) || 5));
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  execute(`
    INSERT INTO student_feedback (id, student_id, student_name, category, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, id, req.user.id, req.user.full_name, category.trim(), numRating, comment.trim(), now);

  logAudit(req.user.id, req.user.full_name, req.user.role, 'FEEDBACK_SUBMITTED', `Feedback submitted under category: ${category}`);

  res.status(201).json({ message: 'Thank you! Your feedback has been recorded and submitted to the academy.', feedbackId: id });
});

// GET /api/feedback: List all feedback for the Feedback Scoreboard
feedbackRouter.get('/', (_req, res: Response) => {
  const feedbacks = queryAll<StudentFeedback>(`
    SELECT * FROM student_feedback
    ORDER BY created_at DESC
  `);

  // Compute average rating
  const stats = queryOne<{ total_feedback: number; avg_rating: number }>(`
    SELECT COUNT(*) as total_feedback,
           COALESCE(AVG(rating), 0) as avg_rating
    FROM student_feedback
  `) || { total_feedback: 0, avg_rating: 0 };

  res.json({
    feedbacks,
    stats: {
      total: stats.total_feedback,
      averageRating: Number(stats.avg_rating.toFixed(1)),
    },
  });
});

// Owner/Admin: Respond to feedback
feedbackRouter.post('/:id/respond', authMiddleware, requireRole('owner', 'admin'), (req: AuthRequest, res: Response) => {
  const { response } = req.body;
  if (!response?.trim()) {
    res.status(400).json({ error: 'Response comment cannot be empty.' });
    return;
  }

  const now = new Date().toISOString();
  execute(`
    UPDATE student_feedback
    SET admin_response = ?, responded_at = ?
    WHERE id = ?
  `, response.trim(), now, req.params.id);

  res.json({ message: 'Response posted successfully to the feedback scoreboard.' });
});
