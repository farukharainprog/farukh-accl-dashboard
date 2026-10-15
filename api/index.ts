import app from '../server/app.js';
import { ensureDatabaseInitialized } from '../server/db.js';

// Initialize database schema and seeds on cold start
ensureDatabaseInitialized();

// Export Express app as Vercel Serverless Function
export default app;
export { app };
