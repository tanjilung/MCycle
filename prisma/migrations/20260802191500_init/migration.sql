-- =============================================================
-- Migration: Initial database schema
-- Creates all tables from scratch — for fresh deployments only
-- =============================================================

-- Enums
DO $$ BEGIN
 CREATE TYPE "public"."PhaseType" AS ENUM('MENSTRUATION', 'FOLLICULAR', 'OVULATION', 'LUTEAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."AuditAction" AS ENUM('LOGIN', 'LOGOUT', 'REGISTER', 'CYCLE_CREATED', 'CYCLE_UPDATED', 'CYCLE_DELETED', 'CYCLE_DEFAULTS_UPDATED', 'PHASE_UPDATED', 'PHASE_DELETED', 'DATA_EXPORTED', 'ACCOUNT_DELETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- User
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- AuthSession
CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_tokenKey" ON "AuthSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- PasskeyCredential
CREATE TABLE IF NOT EXISTS "PasskeyCredential" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "credentialId" BYTEA NOT NULL,
  "publicKey" BYTEA NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "transports" JSONB,
  "deviceName" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastUsedAt" TIMESTAMPTZ,
  CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasskeyCredential_credentialId_key" ON "PasskeyCredential"("credentialId");
CREATE INDEX IF NOT EXISTS "PasskeyCredential_userId_idx" ON "PasskeyCredential"("userId");

-- ManagedPerson
CREATE TABLE IF NOT EXISTS "ManagedPerson" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ManagedPerson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ManagedPerson_userId_key" ON "ManagedPerson"("userId");
CREATE INDEX IF NOT EXISTS "ManagedPerson_userId_idx" ON "ManagedPerson"("userId");

-- AuditLog (before FK to User)
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "metadata" JSONB,
  "lastUsedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CycleDefaults (before FK to ManagedPerson)
CREATE TABLE IF NOT EXISTS "CycleDefaults" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "managedPersonId" TEXT NOT NULL,
  "cycleLengthDays" INTEGER NOT NULL DEFAULT 28,
  "menstruationDays" INTEGER NOT NULL DEFAULT 5,
  "ovulationDays" INTEGER NOT NULL DEFAULT 1,
  "lutealDays" INTEGER NOT NULL DEFAULT 14,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CycleDefaults_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CycleDefaults_managedPersonId_key" ON "CycleDefaults"("managedPersonId");

-- CycleInstance (before FK to ManagedPerson)
CREATE TABLE IF NOT EXISTS "CycleInstance" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "managedPersonId" TEXT NOT NULL,
  "menstruationStartDate" TIMESTAMPTZ NOT NULL,
  "cycleLengthDays" INTEGER NOT NULL,
  "menstruationDays" INTEGER NOT NULL,
  "ovulationDays" INTEGER NOT NULL,
  "lutealDays" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CycleInstance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CycleInstance_managedPersonId_menstruationStartDate_idx" ON "CycleInstance"("managedPersonId", "menstruationStartDate");

-- Phase (before FK to CycleInstance)
CREATE TABLE IF NOT EXISTS "Phase" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "cycleInstanceId" TEXT NOT NULL,
  "phaseType" "PhaseType" NOT NULL,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ NOT NULL,
  "isEdited" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Phase_cycleInstanceId_phaseType_idx" ON "Phase"("cycleInstanceId", "phaseType");

-- Foreign keys (referenced tables must exist)
DO $$ BEGIN
 ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "PasskeyCredential" ADD CONSTRAINT "PasskeyCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ManagedPerson" ADD CONSTRAINT "ManagedPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "CycleDefaults" ADD CONSTRAINT "CycleDefaults_managedPersonId_fkey" FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "CycleInstance" ADD CONSTRAINT "CycleInstance_managedPersonId_fkey" FOREIGN KEY ("managedPersonId") REFERENCES "ManagedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Phase" ADD CONSTRAINT "Phase_cycleInstanceId_fkey" FOREIGN KEY ("cycleInstanceId") REFERENCES "CycleInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
