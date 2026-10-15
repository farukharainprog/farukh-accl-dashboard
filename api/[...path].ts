import app from '../server/app.js';
import { ensureDatabaseInitialized } from '../server/db.js';

// Initialize database schema and seeds on cold start
ensureDatabaseInitialized();

// Catch-all Vercel Serverless Function export for /api/*
export default app;
export { app };
