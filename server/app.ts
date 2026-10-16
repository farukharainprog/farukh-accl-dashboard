import express from 'express';
import dotenv from 'dotenv';
import { ensureDatabaseInitialized } from './db.js';
import { authRouter } from './routes/auth.js';
import { tasksRouter } from './routes/tasks.js';
import { submissionsRouter } from './routes/submissions.js';
import { attendanceRouter } from './routes/attendance.js';
import { admissionsRouter } from './routes/admissions.js';
import { usersRouter } from './routes/users.js';
import { batchesRouter } from './routes/batches.js';
import { feedbackRouter } from './routes/feedback.js';
import { scoreboardRouter } from './routes/scoreboard.js';
import { settingsRouter } from './routes/settings.js';
import { syncRouter } from './routes/sync.js';

dotenv.config();

// Ensure DB schema and seeds are initialized
ensureDatabaseInitialized();

export const app = express();

// CORS & Preflight handling
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup API router
const apiRouter = express.Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/submissions', submissionsRouter);
apiRouter.use('/attendance', attendanceRouter);
apiRouter.use('/admissions', admissionsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/batches', batchesRouter);
apiRouter.use('/feedback', feedbackRouter);
apiRouter.use('/scoreboard', scoreboardRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/sync', syncRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Farukh Businessman Wala ACCL Dashboard API',
    timestamp: new Date().toISOString(),
  });
});

// Mount at both '/api' and '/' so that it works seamlessly whether Vercel preserves or strips '/api'
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global JSON error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global API Error]:', err);
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || 'An internal server error occurred.',
  });
});

export default app;
