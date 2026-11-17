-- Migration: extend memories table for new memory architecture
-- Guarded with IF EXISTS so a fresh database (which never had this table) skips safely.

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memories') THEN
    ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();
  END IF;
END $$;
