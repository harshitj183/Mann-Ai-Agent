import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      key        TEXT    NOT NULL,
      value      TEXT    NOT NULL,
      type       TEXT    DEFAULT 'skill' CHECK(type IN ('skill','memory','context')),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, key)
    );

    CREATE TABLE IF NOT EXISTS skills (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT,
      code        TEXT,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_skills_user   ON skills(user_id);
  `)
  console.log('✅ memory-service: DB tables ready')
}

await initDB()

export default pool
