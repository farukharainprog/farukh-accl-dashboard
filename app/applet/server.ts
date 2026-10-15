import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.js';
import { authRouter } from './server/routes/auth.js';
import { tasksRouter } from './server/routes/tasks.js';
import { submissionsRouter } from './server/routes/submissions.js';
import { attendanceRouter } from './server/routes/attendance.js';
import { admissionsRouter } from './server/routes/admissions.js';
import { usersRouter } from './server/routes/users.js';
import { batchesRouter } from './server/routes/batches.js';
import { feedbackRouter } from './server/routes/feedback.js';
import { scoreboardRouter } from './server/routes/scoreboard.js';
import { settingsRouter } from './server/routes/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize SQLite database, schema, and tasks seed
  initDatabase();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/submissions', submissionsRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/admissions', admissionsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/scoreboard', scoreboardRouter);
  app.use('/api/settings', settingsRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Farukh Businessman Wala ACCL Dashboard API',
      timestamp: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Dev] Vite middleware attached for SPA dev server.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Farukh Businessman Wala ACCL Dashboard running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Failed to start server:', err);
  process.exit(1);
});
