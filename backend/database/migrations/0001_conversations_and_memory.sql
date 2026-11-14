-- Migration: add conversations table + conversation_id to messages
-- Short-term memory: messages grouped by conversation
-- Long-term memory: memories.type='context' used for summaries (table already exists)

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"         serial PRIMARY KEY,
  "user_id"    integer NOT NULL,
  "title"      text NOT NULL DEFAULT 'New conversation',
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_user" ON "conversations" ("user_id");

--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "conversation_id" integer
  REFERENCES "conversations"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_conversation" ON "messages" ("conversation_id");
