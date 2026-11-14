import { integer, serial, text, timestamp, pgTable, index } from 'drizzle-orm/pg-core'

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull().default('New conversation'),
  // Session memory: JSON object { motive, topics, outcome } updated by memory-agent after each turn
  sessionSummary: text('session_summary').default(null),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_conversations_user').on(table.userId),
}))

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  conversationId: integer('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx:         index('idx_messages_user').on(table.userId),
  convIdx:         index('idx_messages_conversation').on(table.conversationId),
}))
