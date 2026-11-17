-- Baseline migration: creates the full initial schema on a fresh database.
-- Uses IF NOT EXISTS throughout so it is safe to re-run on an existing DB.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
  "id"            serial PRIMARY KEY,
  "name"          text NOT NULL,
  "email"         text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "avatar"        text,
  "profile"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id"         serial PRIMARY KEY,
  "user_id"    integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token"      text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "expires_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "user_sessions" ("token");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"              serial PRIMARY KEY,
  "user_id"         integer NOT NULL,
  "title"           text NOT NULL DEFAULT 'New conversation',
  "session_summary" text DEFAULT NULL,
  "created_at"      timestamptz DEFAULT now(),
  "updated_at"      timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_user" ON "conversations" ("user_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
  "id"              serial PRIMARY KEY,
  "user_id"         integer NOT NULL,
  "conversation_id" integer REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role"            text NOT NULL,
  "content"         text NOT NULL,
  "created_at"      timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_user"         ON "messages" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_conversation" ON "messages" ("conversation_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
  "id"            serial PRIMARY KEY,
  "user_id"       integer NOT NULL,
  "name"          text NOT NULL,
  "description"   text,
  "system_prompt" text,
  "status"        text DEFAULT 'idle',
  "created_at"    timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agents_user" ON "agents" ("user_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id"           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id"      bigint NOT NULL,
  "request"      text NOT NULL,
  "status"       text NOT NULL,
  "output"       text,
  "error"        text,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_runs_user_id_created_at" ON "agent_runs" ("user_id", "created_at");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
  "id"          serial PRIMARY KEY,
  "user_id"     integer NOT NULL,
  "name"        text NOT NULL,
  "description" text,
  "code"        text,
  "created_at"  timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_user" ON "skills" ("user_id");
