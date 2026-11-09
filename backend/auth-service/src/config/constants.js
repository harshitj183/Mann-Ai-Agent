import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../..', '.env') })

export const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key-change-in-production'
export const JWT_EXPIRES_IN = '24h'
export const PORT = process.env.PORT || 3001
