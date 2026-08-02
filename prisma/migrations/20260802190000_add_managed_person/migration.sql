-- =============================================================
-- Migration: Add ManagedPerson relay table, migrate away from userId on CycleDefaults / CycleInstance
-- Idempotent — safe to run on fresh or existing production DB
-- =============================================================

-- Step 1: Create ManagedPerson table (idempotent)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ManagedPerson') THEN
      CREATE TABLE "ManagedPerson" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT "ManagedPerson_pkey" PRIMARY KEY ("id")
      );
   END IF;
END $$;

-- Step 2: Add FK ManagedPerson.userId → User.id
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ManagedPerson_userId_fkey' AND table_name = 'ManagedPerson') THEN
      ALTER TABLE "ManagedPerson" ADD CONSTRAINT "ManagedPerson_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF;
END $$;

-- Step 3: Unique index on userId (one ManagedPerson per user) + regular index for JOIN lookups
CREATE UNIQUE INDEX IF NOT EXISTS "ManagedPerson_userId_key" ON "ManagedPerson"("userId");
CREATE INDEX IF NOT EXISTS "ManagedPerson_userId_idx" ON "ManagedPerson"("userId");

-- Step 4: Add managedPersonId to CycleDefaults (if not exists)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleDefaults' AND column_name = 'managedPersonId') THEN
      ALTER TABLE "CycleDefaults" ADD COLUMN "managedPersonId" TEXT;
   END IF;
END $$;

-- Step 5: Add managedPersonId to CycleInstance (if not exists)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleInstance' AND column_name = 'managedPersonId') THEN
      ALTER TABLE "CycleInstance" ADD COLUMN "managedPersonId" TEXT;
   END IF;
END $$;

-- Step 6: Create a temp mapping table to preserve userId → ManagedPerson.id mapping
--         before we drop the old userId columns (needed for per-user backfill)
CREATE TEMPORARY TABLE IF NOT EXISTS _mp_migration_map AS
SELECT DISTINCT cd."userId", mp."id" AS new_managedPersonId
FROM "CycleDefaults" cd
LEFT JOIN "ManagedPerson" mp ON mp."userId" = cd."userId"
WHERE cd."userId" IS NOT NULL;

-- Step 7: Migrate CycleDefaults → ManagedPerson (while userId still exists on CycleDefaults)
DO $$ 
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleDefaults' AND column_name = 'userId') THEN
      -- Create one ManagedPerson per distinct userId in CycleDefaults (skip if already exists)
      INSERT INTO "ManagedPerson" ("userId", "name")
      SELECT DISTINCT cd."userId", COALESCE(u."name", 'Migrated User')
      FROM "CycleDefaults" cd
      LEFT JOIN "User" u ON u."id" = cd."userId"
      WHERE cd."userId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "ManagedPerson" mp WHERE mp."userId" = cd."userId");

      -- Update temp table with newly created ManagedPerson IDs
      UPDATE _mp_migration_map mmp
      SET new_managedPersonId = mp."id"
      FROM "ManagedPerson" mp
      WHERE mp."userId" = mmp."userId"
        AND mmp.new_managedPersonId IS NULL;

      -- Backfill CycleDefaults.managedPersonId using temp table (per-user accurate)
      UPDATE "CycleDefaults" cd
      SET "managedPersonId" = mmp.new_managedPersonId
      FROM _mp_migration_map mmp
      WHERE mmp."userId" = cd."userId"
        AND cd."managedPersonId" IS NULL;

      -- Backfill CycleInstance.managedPersonId using temp table (per-user accurate)
      UPDATE "CycleInstance" ci
      SET "managedPersonId" = mmp.new_managedPersonId
      FROM _mp_migration_map mmp
      WHERE mmp."userId" = ci."userId"
        AND ci."managedPersonId" IS NULL;
   END IF;
END $$;

-- Step 8: Drop old unique index + FK + column on CycleDefaults (if they exist)
DO $$ 
BEGIN
   IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'CycleDefaults' AND indexname = 'CycleDefaults_userId_key') THEN
      DROP INDEX "CycleDefaults_userId_key";
   END IF;
   IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleDefaults_userId_fkey' AND table_name = 'CycleDefaults') THEN
      ALTER TABLE "CycleDefaults" DROP CONSTRAINT "CycleDefaults_userId_fkey";
   END IF;
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleDefaults' AND column_name = 'userId') THEN
      ALTER TABLE "CycleDefaults" DROP COLUMN "userId";
   END IF;
END $$;

-- Step 9: Drop old composite index + FK + column on CycleInstance (if they exist)
DO $$ 
BEGIN
   IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'CycleInstance' AND indexname = 'CycleInstance_userId_menstruationStartDate_idx') THEN
      DROP INDEX "CycleInstance_userId_menstruationStartDate_idx";
   END IF;
   IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleInstance_userId_fkey' AND table_name = 'CycleInstance') THEN
      ALTER TABLE "CycleInstance" DROP CONSTRAINT "CycleInstance_userId_fkey";
   END IF;
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleInstance' AND column_name = 'userId') THEN
      ALTER TABLE "CycleInstance" DROP COLUMN "userId";
   END IF;
END $$;

-- Step 10: Add FK for CycleDefaults.managedPersonId → ManagedPerson.id
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleDefaults_managedPersonId_fkey' AND table_name = 'CycleDefaults') THEN
      ALTER TABLE "CycleDefaults" ADD CONSTRAINT "CycleDefaults_managedPersonId_fkey"
          FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF;
END $$;

-- Step 11: Add FK for CycleInstance.managedPersonId → ManagedPerson.id
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleInstance_managedPersonId_fkey' AND table_name = 'CycleInstance') THEN
      ALTER TABLE "CycleInstance" ADD CONSTRAINT "CycleInstance_managedPersonId_fkey"
          FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF;
END $$;

-- Step 12: Ensure every User has a ManagedPerson (safety net for users with no cycles/defaulty), then set NOT NULL
DO $$ 
BEGIN
   -- Create ManagedPerson for any user missing one
   INSERT INTO "ManagedPerson" ("userId", "name")
   SELECT u."id", COALESCE(u."name", 'Default User')
   FROM "User" u
   WHERE NOT EXISTS (SELECT 1 FROM "ManagedPerson" mp WHERE mp."userId" = u."id");

   -- Backfill any remaining NULL managedPersonId on CycleDefaults (should be none after Step 7)
   UPDATE "CycleDefaults" cd
   SET "managedPersonId" = mp."id"
   FROM "ManagedPerson" mp
   WHERE cd."managedPersonId" IS NULL
     AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = mp."userId");

   -- Fallback: if any still NULL, assign to first available managed person
   IF EXISTS (SELECT 1 FROM "CycleDefaults" WHERE "managedPersonId" IS NULL) THEN
      UPDATE "CycleDefaults" 
      SET "managedPersonId" = (SELECT MIN("id") FROM "ManagedPerson") 
      WHERE "managedPersonId" IS NULL;
   END IF;

   ALTER TABLE "CycleDefaults" ALTER COLUMN "managedPersonId" SET NOT NULL;

   -- Backfill any remaining NULL managedPersonId on CycleInstance
   UPDATE "CycleInstance" ci
   SET "managedPersonId" = mp."id"
   FROM "ManagedPerson" mp
   WHERE ci."managedPersonId" IS NULL
     AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = mp."userId");

   -- Fallback: if any still NULL, assign to first available managed person
   IF EXISTS (SELECT 1 FROM "CycleInstance" WHERE "managedPersonId" IS NULL) THEN
      UPDATE "CycleInstance" 
      SET "managedPersonId" = (SELECT MIN("id") FROM "ManagedPerson") 
      WHERE "managedPersonId" IS NULL;
   END IF;

   ALTER TABLE "CycleInstance" ALTER COLUMN "managedPersonId" SET NOT NULL;
END $$;

-- Step 13: Recreate indexes lost when userId columns were dropped
CREATE UNIQUE INDEX IF NOT EXISTS "CycleDefaults_managedPersonId_key" ON "CycleDefaults"("managedPersonId");
CREATE INDEX IF NOT EXISTS "CycleInstance_managedPersonId_menstruationStartDate_idx" ON "CycleInstance"("managedPersonId", "menstruationStartDate");

-- Step 14: Add lastUsedAt column to AuditLog (nullable per Prisma schema)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'lastUsedAt') THEN
      ALTER TABLE "AuditLog" ADD COLUMN "lastUsedAt" TIMESTAMPTZ;
   END IF;
END $$;

-- Cleanup: drop temp table
DROP TABLE IF EXISTS _mp_migration_map;
