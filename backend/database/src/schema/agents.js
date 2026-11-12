import { bigint, integer, serial, text, timestamp, pgTable, index } from 'drizzle-orm/pg-core'

export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt'),
  status: text('status', { enum: ['idle', 'running', 'paused'] }).default('idle'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_agents_user').on(table.userId),
}))

export const agentRuns = pgTable('agent_runs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  request: text('request').notNull(),
  status: text('status', { enum: ['completed', 'failed'] }).notNull(),
  output: text('output'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userCreatedIdx: index('idx_agent_runs_user_id_created_at').on(table.userId, table.createdAt),
}))
