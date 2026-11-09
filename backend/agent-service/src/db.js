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
    CREATE TABLE IF NOT EXISTS agents (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL,
      name          TEXT    NOT NULL,
      description   TEXT,
      system_prompt TEXT,
      status        TEXT    DEFAULT 'idle' CHECK(status IN ('idle','running','paused')),
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
  `)
  console.log('✅ agent-service: DB tables ready')
}

await initDB()

export default pool
