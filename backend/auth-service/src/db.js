import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Root .env load karo — service folder se 3 levels upar Mann/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import pg from 'pg'

const { Pool } = pg

// 🔵 Pool = multiple DB connections manage karta hai automatically
// min: 2 connections hamesha ready, max: 10 connections tak ja sakta hai
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// 🟢 Tables create karo on startup
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       TEXT    NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now(),
      expires_at  TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
  `)
  console.log('✅ auth-service: DB tables ready')
}

await initDB()

export default pool
