-- Step 1: Create the ManagedPerson relay table
CREATE TABLE "ManagedPerson" (
    "id" TEXT NOT NULL DEFAULT gen_random_text_uuid(),
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagedPerson_pkey" PRIMARY KEY ("id")
);

-- Unique + index on userId for efficient joins
CREATE UNIQUE INDEX "ManagedPerson_userId_key" ON "ManagedPerson"("userId");
CREATE INDEX "ManagedPerson_userId_idx" ON "ManagedPerson"("userId");

-- Step 2: Add managedPersonId to CycleDefaults (nullable during migration)
ALTER TABLE "CycleDefaults" ADD COLUMN "managedPersonId" TEXT;

-- Step 3: Add managedPersonId to CycleInstance (nullable during migration)
ALTER TABLE "CycleInstance" ADD COLUMN "managedPersonId" TEXT;

-- Step 4: Create foreign keys for the new columns (will be re-created after userId is dropped)

-- Step 5: Migrate existing CycleDefaults rows → ManagedPerson + backfill
INSERT INTO "ManagedPerson" ("userId", "name")
SELECT DISTINCT cd."userId", COALESCE(u."name", 'Migrated User')
FROM "CycleDefaults" cd
LEFT JOIN "User" u ON u."id" = cd."userId"
WHERE NOT EXISTS (SELECT 1 FROM "ManagedPerson" mp WHERE mp."userId" = cd."userId");

UPDATE "CycleDefaults" cd
SET "managedPersonId" = mp."id"
FROM "ManagedPerson" mp
WHERE mp."userId" = cd."userId";

-- Step 6: Migrate existing CycleInstance rows → backfill managedPersonId
UPDATE "CycleInstance" ci
SET "managedPersonId" = mp."id"
FROM "ManagedPerson" mp
WHERE mp."userId" = ci."userId";

-- Step 7: Drop old foreign keys and userId columns from CycleDefaults
ALTER TABLE "CycleDefaults" DROP CONSTRAINT "CycleDefaults_userId_fkey" IF EXISTS;
ALTER TABLE "CycleDefaults" DROP COLUMN IF EXISTS "userId";

-- Step 8: Drop old foreign keys and userId columns from CycleInstance
ALTER TABLE "CycleInstance" DROP CONSTRAINT "CycleInstance_userId_fkey" IF EXISTS;
ALTER TABLE "CycleInstance" DROP COLUMN IF EXISTS "userId";

-- Step 9: Add new foreign key for managedPerson on CycleDefaults
ALTER TABLE "CycleDefaults" ADD CONSTRAINT "CycleDefaults_managedPersonId_fkey" 
    FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Add new foreign key for managedPerson on CycleInstance
ALTER TABLE "CycleInstance" ADD CONSTRAINT "CycleInstance_managedPersonId_fkey" 
    FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Add lastUsedAt column to AuditLog (nullable for existing rows)
ALTER TABLE "AuditLog" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
