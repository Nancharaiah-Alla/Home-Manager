import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { getDb } from '../server/db';
import { seedDemoHouseholdIfEmpty } from '../server/seed';
import { apiRouter } from '../server/routes';

const app = express();

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Enable CORS and popups for OAuth window.close compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Serverless DB initialization singleton
let initPromise: Promise<void> | null = null;
async function ensureServerlessDb() {
  if (!initPromise) {
    initPromise = (async () => {
      await getDb();
      try {
        seedDemoHouseholdIfEmpty();
      } catch (seedErr) {
        console.warn('Seed demo check encountered error:', seedErr);
      }
    })();
  }
  return initPromise;
}

app.use(async (_req, res, next) => {
  try {
    await ensureServerlessDb();
    next();
  } catch (err) {
    console.error('Database initialization error in Vercel serverless function:', err);
    initPromise = null; // Allow retry on subsequent calls
    res.status(500).json({
      error: 'Database failed to initialize: ' + (err instanceof Error ? err.message : String(err)),
    });
  }
});

// Handle both /api prefixed routes and stripped routes
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'vercel-serverless',
    timestamp: new Date().toISOString(),
  });
});

export default app;
