import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database/migrations');
const sql = await fs.readFile(path.join(directory, '001_initial.sql'), 'utf8');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log('CareerLens database migration applied.');
} finally {
  await pool.end();
}