-- Migration: add profile JSONB column to users table and drop memories / user_profiles

-- 1. Add profile column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile" jsonb DEFAULT '{}'::jsonb NOT NULL;

-- 2. Migrate existing facts from memories table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'memories') THEN
    UPDATE "users" u
    SET "profile" = u."profile" || m_agg.profile
    FROM (
      SELECT user_id, jsonb_object_agg(key, value) AS profile
      FROM "memories"
      WHERE type = 'fact' OR type IS NULL
      GROUP BY user_id
    ) m_agg
    WHERE u.id = m_agg.user_id;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    UPDATE "users" u
    SET "profile" = u."profile" || up."profile"
    FROM "user_profiles" up
    WHERE u.id = up.user_id;
  END IF;
END $$;

-- 3. Drop legacy tables
DROP TABLE IF EXISTS "memories" CASCADE;
DROP TABLE IF EXISTS "user_profiles" CASCADE;
