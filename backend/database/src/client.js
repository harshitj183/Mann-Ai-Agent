import dotenv from 'dotenv'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema/index.js'

dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

export const db = drizzle(pool, { schema })
