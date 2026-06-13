/**
 * LocaStay Backend — Express.js REST API
 * Runs on PORT (default 4000). Frontend calls http://localhost:4000/api/*
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes          from './routes/auth.routes';
import propertiesRoutes    from './routes/properties.routes';
import bookingsRoutes      from './routes/bookings.routes';
import reviewsRoutes       from './routes/reviews.routes';
import paymentsRoutes      from './routes/payments.routes';
import notificationsRoutes from './routes/notifications.routes';
import landlordRoutes      from './routes/landlord.routes';
import tenantRoutes        from './routes/tenant.routes';
import adminRoutes         from './routes/admin.routes';
import uploadRoutes        from './routes/upload.routes';
import { notFound, errorHandler } from './middleware/error.middleware';

const app  = express();
const PORT = Number(process.env.PORT ?? 4000);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,
}));

// Rate limits
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static — serve uploaded files ─────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/properties',    propertiesRoutes);
app.use('/api/bookings',      bookingsRoutes);
app.use('/api/reviews',       reviewsRoutes);
app.use('/api/payments',      paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/landlord',      landlordRoutes);
app.use('/api/tenant',        tenantRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/upload',        uploadRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 LocaStay API running at http://localhost:${PORT}`);
  console.log(`   DB          : ${process.env.DATABASE_URL}`);
  console.log(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   CORS origins: ${allowedOrigins.join(', ')}\n`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use. Run: lsof -ti:${PORT} | xargs kill -9\n`);
    process.exit(1);
  }
  throw err;
});

export default app;
