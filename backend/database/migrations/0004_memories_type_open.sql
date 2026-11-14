-- Migration: remove enum constraint on memories.type column
-- New memory architecture uses types: 'fact', 'session', 'skill', 'context', 'memory'
-- Using ALTER COLUMN to change type from enum-like text to plain text,
-- preserving all existing data.

--> statement-breakpoint
-- Drop the existing check constraint if present (Drizzle text enum creates a check constraint in PG)
ALTER TABLE "memories" DROP CONSTRAINT IF EXISTS "memories_type_check";

--> statement-breakpoint
-- Alter the column to plain text with no constraint
ALTER TABLE "memories" ALTER COLUMN "type" TYPE text;

--> statement-breakpoint
-- Set a sane default
ALTER TABLE "memories" ALTER COLUMN "type" SET DEFAULT 'skill';
