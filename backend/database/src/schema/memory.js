import { integer, serial, text, timestamp, pgTable, index } from 'drizzle-orm/pg-core'

export const skills = pgTable('skills', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  code: text('code'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_skills_user').on(table.userId),
}))

