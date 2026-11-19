import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorHandler, notFound } from './errors.js';
import { loadUser } from './auth.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import sellerRoutes from './routes/seller.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Render's / Netlify's proxy: needed for secure cookies

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    });
    next();
  });

  // Optional CORS, only for origins listed in CORS_ORIGINS (not needed when Netlify proxies /api).
  if (config.corsOrigins.length) {
    app.use('/api', (req, res, next) => {
      const origin = req.headers.origin;
      if (origin && config.corsOrigins.includes(origin)) {
        res.set({
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          Vary: 'Origin',
        });
      }
      if (req.method === 'OPTIONS') return res.status(204).end();
      next();
    });
  }

  // Uploaded images: immutable files with random names, so they can be cached for a long time.
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '30d', immutable: true, index: false, fallthrough: false }));

  const api = express.Router();
  api.use(express.json({ limit: '100kb' }));
  api.use(cookieParser());
  api.use(loadUser);
  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.use(authRoutes, catalogRoutes, cartRoutes, orderRoutes, reviewRoutes, sellerRoutes);
  api.use((_req, _res, next) => next(notFound('Endpoint')));
  app.use('/api', api);

  // Serve the built frontend when it exists (one-process mode: `npm start` after `npm run build`).
  if (fs.existsSync(path.join(config.clientDist, 'index.html'))) {
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
