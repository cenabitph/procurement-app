import { readFileSync } from 'fs';
import { join } from 'path';
import pool from './index';

const schema = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf-8');

// Split by semicolons and run each statement
const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const conn = await pool.getConnection();
try {
  for (const stmt of statements) {
    await conn.query(stmt);
  }
  console.log('✔  Database schema applied successfully.');
} finally {
  conn.release();
  await pool.end();
}
