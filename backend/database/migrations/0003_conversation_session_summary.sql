-- Migration: add session_summary column to conversations table
-- Stores the memory-agent's JSON session summary { motive, topics, outcome }
-- directly on the conversation row — no separate memories lookup needed.

--> statement-breakpoint
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "session_summary" text DEFAULT NULL;
