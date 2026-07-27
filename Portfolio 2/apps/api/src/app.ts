import path from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, isProd } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { prisma } from './lib/prisma.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', Number.isNaN(Number(env.TRUST_PROXY)) ? env.TRUST_PROXY : Number(env.TRUST_PROXY));
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Assets are served cross-origin to the Next.js app.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              mediaSrc: ["'self'", 'https:', 'blob:'],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              connectSrc: ["'self'", ...env.CORS_ORIGINS],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
            },
          }
        : false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/server-to-server requests arrive without an Origin header.
        if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86_400,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url?.startsWith('/static') === true,
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // Locally stored uploads. Behind Nginx in production this is served directly.
  if (env.STORAGE_DRIVER === 'local') {
    app.use(
      '/static',
      express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
        maxAge: isProd ? '365d' : 0,
        immutable: isProd,
        index: false,
        setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
      }),
    );
  }

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', uptime: process.uptime(), database: 'connected' });
    } catch {
      res.status(503).json({ status: 'degraded', uptime: process.uptime(), database: 'unreachable' });
    }
  });

  app.use('/api', globalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
