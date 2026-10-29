import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, databaseReady } from './db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import analysisRoutes from './routes/analyses.js';

const app = express();
const port = Number(process.env.PORT || 8787);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const clientDist = path.join(projectRoot, 'dist');
const origin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

app.disable('x-powered-by');
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const analysisLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Analysis limit reached. Wait a few minutes before trying again.' } });
const uploadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Upload limit reached. Wait a few minutes before trying again.' } });
app.use('/api/resumes', uploadLimiter);
app.use('/api/analyses/analyze', analysisLimiter);
app.use('/api/job-matches/analyze', analysisLimiter);

app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CareerLens AI',
    database: await databaseReady() ? 'postgres' : 'demo',
    analysisMode: process.env.OPENAI_API_KEY ? 'ai-available-with-consent' : 'demo'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', analysisRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: `Resume must be smaller than ${process.env.MAX_RESUME_SIZE_MB || 5} MB.` });
  console.error('CareerLens request failed:', err?.message || 'Unknown error');
  res.status(500).json({ message: 'Something went wrong while processing this request.' });
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`CareerLens API listening on http://127.0.0.1:${port}`);
});

async function shutdown() {
  server.close(async () => {
    if (pool) await pool.end().catch(() => {});
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);