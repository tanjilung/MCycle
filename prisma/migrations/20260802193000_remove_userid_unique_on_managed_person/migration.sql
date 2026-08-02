-- Drop the old unique constraint on ManagedPerson.userId
DROP INDEX IF EXISTS "ManagedPerson_userId_key";

-- Add composite unique index: multiple people per user, but no duplicate names within same user
CREATE UNIQUE INDEX IF NOT EXISTS "ManagedPerson_userId_name_key" ON "ManagedPerson"("userId", "name");
