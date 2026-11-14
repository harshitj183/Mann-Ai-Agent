import { integer, serial, text, timestamp, pgTable, index, unique } from 'drizzle-orm/pg-core'

// Long-term memory: clean key-value facts about the user (name, job, preferences …)
// type = 'fact'    → extracted by memory-agent (e.g. key='user_name' value='Harshit')
// type = 'session' → per-conversation JSON motive summary (key='session_{convId}')
// type = 'skill'   → user-managed reusable snippets (unchanged)
// type = 'context' → legacy, kept for backward compat
export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  type: text('type').default('skill'),     // values: 'fact' | 'session' | 'skill' | 'context'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
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
