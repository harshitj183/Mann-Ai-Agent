import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Root .env load karo — src/ se 3 levels upar Mann/.env
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
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      role       TEXT    NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT    NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
  `)
  console.log('✅ chat-service: DB tables ready')
}

await initDB()

export default pool
