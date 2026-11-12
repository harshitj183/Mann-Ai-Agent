import 'dotenv/config'

export default {
  dialect: 'postgresql',
  schema: './src/schema/*.js',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
}
