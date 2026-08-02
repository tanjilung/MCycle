-- Step 1: Create the ManagedPerson relay table (idempotent)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ManagedPerson') THEN
      CREATE TABLE "ManagedPerson" (
          "id" TEXT NOT NULL DEFAULT gen_random_text_uuid(),
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ManagedPerson_pkey" PRIMARY KEY ("id")
      );
   END IF;
END $$;

-- Unique + index on userId for efficient joins
CREATE UNIQUE INDEX IF NOT EXISTS "ManagedPerson_userId_key" ON "ManagedPerson"("userId");
CREATE INDEX IF NOT EXISTS "ManagedPerson_userId_idx" ON "ManagedPerson"("userId");

-- Step 2: Add managedPersonId to CycleDefaults (only if not exists)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleDefaults' AND column_name = 'managedPersonId') THEN
      ALTER TABLE "CycleDefaults" ADD COLUMN "managedPersonId" TEXT;
   END IF;
END $$;

-- Step 3: Add managedPersonId to CycleInstance (only if not exists)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleInstance' AND column_name = 'managedPersonId') THEN
      ALTER TABLE "CycleInstance" ADD COLUMN "managedPersonId" TEXT;
   END IF;
END $$;

-- Step 4: Migrate existing CycleDefaults rows → ManagedPerson + backfill (if userId col exists)
DO $$ 
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleDefaults' AND column_name = 'userId') THEN
      -- Insert new managed persons from cycle defaults
      INSERT INTO "ManagedPerson" ("userId", "name")
      SELECT DISTINCT cd."userId", COALESCE(u."name", 'Migrated User')
      FROM "CycleDefaults" cd
      LEFT JOIN "User" u ON u."id" = cd."userId"
      WHERE NOT EXISTS (SELECT 1 FROM "ManagedPerson" mp WHERE mp."userId" = cd."userId")
      AND cd."userId" IS NOT NULL;

      -- Backfill CycleDefaults with managedPersonId
      UPDATE "CycleDefaults" cd
      SET "managedPersonId" = mp."id"
      FROM "ManagedPerson" mp
      WHERE mp."userId" = cd."userId"
      AND cd."managedPersonId" IS NULL;
   END IF;
END $$;

-- Step 5: Migrate existing CycleInstance rows to backfill managedPersonId (if userId col exists)
DO $$ 
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleInstance' AND column_name = 'userId') THEN
      UPDATE "CycleInstance" ci
      SET "managedPersonId" = mp."id"
      FROM "ManagedPerson" mp
      WHERE mp."userId" = ci."userId"
      AND ci."managedPersonId" IS NULL;
   END IF;
END $$;

-- Step 6: Drop old foreign keys and userId columns from CycleDefaults (if they exist)
DO $$ 
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleDefaults_userId_fkey' AND table_name = 'CycleDefaults') THEN
      ALTER TABLE "CycleDefaults" DROP CONSTRAINT "CycleDefaults_userId_fkey";
   END IF;
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleDefaults' AND column_name = 'userId') THEN
      ALTER TABLE "CycleDefaults" DROP COLUMN "userId";
   END IF;
END $$;

-- Step 7: Drop old foreign keys and userId columns from CycleInstance (if they exist)
DO $$ 
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleInstance_userId_fkey' AND table_name = 'CycleInstance') THEN
      ALTER TABLE "CycleInstance" DROP CONSTRAINT "CycleInstance_userId_fkey";
   END IF;
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CycleInstance' AND column_name = 'userId') THEN
      ALTER TABLE "CycleInstance" DROP COLUMN "userId";
   END IF;
END $$;

-- Step 8: Add new foreign key for managedPerson on CycleDefaults (if not exists)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleDefaults_managedPersonId_fkey' AND table_name = 'CycleDefaults') THEN
      ALTER TABLE "CycleDefaults" ADD CONSTRAINT "CycleDefaults_managedPersonId_fkey"
          FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF;
END $$;

-- Step 9: Add new foreign key for managedPerson on CycleInstance (if not exists)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CycleInstance_managedPersonId_fkey' AND table_name = 'CycleInstance') THEN
      ALTER TABLE "CycleInstance" ADD CONSTRAINT "CycleInstance_managedPersonId_fkey"
          FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF;
END $$;

-- Step 10: Add lastUsedAt column to AuditLog (nullable for existing rows)
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'lastUsedAt') THEN
      ALTER TABLE "AuditLog" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
   END IF;
END $$;
