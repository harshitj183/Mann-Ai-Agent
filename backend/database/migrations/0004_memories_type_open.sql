-- Migration: remove enum constraint on memories.type column
-- Guarded with IF EXISTS so a fresh database skips safely.

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memories') THEN
    ALTER TABLE "memories" DROP CONSTRAINT IF EXISTS "memories_type_check";
    ALTER TABLE "memories" ALTER COLUMN "type" TYPE text;
    ALTER TABLE "memories" ALTER COLUMN "type" SET DEFAULT 'skill';
  END IF;
END $$;
