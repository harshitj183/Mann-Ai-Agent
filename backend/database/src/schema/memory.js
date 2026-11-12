import { integer, serial, text, timestamp, pgTable, index, unique } from 'drizzle-orm/pg-core'

export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  type: text('type', { enum: ['skill', 'memory', 'context'] }).default('skill'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_memories_user').on(table.userId),
  userKeyUnique: unique('memories_user_key_unique').on(table.userId, table.key),
}))

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
