import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { getDb } from './db';
import { seedDemoHouseholdIfEmpty } from './seed';
import { apiRouter } from './routes';

const app = express();

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Enable CORS and allow OAuth popups without cross-origin policy restrictions
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
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Restore original URL from Vercel rewrite headers if available
app.use((req, _res, next) => {
  const forwardedUri = req.headers['x-forwarded-uri'] as string;
  const matchedPath = req.headers['x-matched-path'] as string;
  const originalUrlHeader = req.headers['x-original-url'] as string;

  if (req.query && typeof req.query.path === 'string') {
    req.url = '/api/' + req.query.path;
  } else if (forwardedUri && forwardedUri.startsWith('/api')) {
    req.url = forwardedUri;
  } else if (matchedPath && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  } else if (originalUrlHeader && originalUrlHeader.startsWith('/api')) {
    req.url = originalUrlHeader;
  }
  next();
});

// Fast health check endpoints BEFORE DB init so health checks NEVER fail or time out
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'vercel-serverless',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'vercel-serverless',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    message: 'Home Manager API is live',
    timestamp: new Date().toISOString(),
  });
});

// Serverless DB initialization singleton
let initPromise: Promise<void> | null = null;
async function ensureServerlessDb() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await getDb();
        try {
          seedDemoHouseholdIfEmpty();
        } catch (seedErr) {
          console.warn('Seed demo check encountered error:', seedErr);
        }
      } catch (dbErr) {
        console.error('Fatal DB init error:', dbErr);
        initPromise = null;
        throw dbErr;
      }
    })();
  }
  return initPromise;
}

// Database initialization middleware for data endpoints
app.use(async (_req, res, next) => {
  try {
    await ensureServerlessDb();
    next();
  } catch (err) {
    console.error('Database initialization error in Vercel serverless function:', err);
    res.status(500).json({
      error: 'Database failed to initialize: ' + (err instanceof Error ? err.message : String(err)),
    });
  }
});

// Handle both /api prefixed routes and stripped routes
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Catch-all 404 handler so Express ALWAYS returns a response and Vercel never times out
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.url}`,
  });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal Server Error',
    });
  }
});

export default async function handler(req: Request, res: Response) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Fatal error in serverless handler:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(err) }));
    }
  }
}
