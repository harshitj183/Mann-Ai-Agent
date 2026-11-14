-- Migration: extend memories table for new memory architecture
-- - Add updated_at column (tracks when a fact was last refreshed)
-- - The type column keeps TEXT so old 'memory'/'context' rows still work;
--   new types 'fact' and 'session' are added by the app layer.

--> statement-breakpoint
ALTER TABLE "memories"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();
