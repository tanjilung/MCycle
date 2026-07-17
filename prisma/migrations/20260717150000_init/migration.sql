-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."PhaseType" AS ENUM ('MENSTRUATION', 'FOLLICULAR', 'OVULATION', 'LUTEAL');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'REGISTER', 'CYCLE_CREATED', 'CYCLE_UPDATED', 'CYCLE_DEFAULTS_UPDATED', 'PHASE_UPDATED', 'DATA_EXPORTED', 'ACCOUNT_DELETED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasskeyCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" BYTEA NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" JSONB,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CycleDefaults" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleLengthDays" INTEGER NOT NULL DEFAULT 28,
    "menstruationDays" INTEGER NOT NULL DEFAULT 5,
    "ovulationDays" INTEGER NOT NULL DEFAULT 1,
    "lutealDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleDefaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CycleInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menstruationStartDate" TIMESTAMP(3) NOT NULL,
    "cycleLengthDays" INTEGER NOT NULL,
    "menstruationDays" INTEGER NOT NULL,
    "ovulationDays" INTEGER NOT NULL,
    "lutealDays" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Phase" (
    "id" TEXT NOT NULL,
    "cycleInstanceId" TEXT NOT NULL,
    "phaseType" "public"."PhaseType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "public"."AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "public"."AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasskeyCredential_credentialId_key" ON "public"."PasskeyCredential"("credentialId");

-- CreateIndex
CREATE INDEX "PasskeyCredential_userId_idx" ON "public"."PasskeyCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CycleDefaults_userId_key" ON "public"."CycleDefaults"("userId");

-- CreateIndex
CREATE INDEX "CycleInstance_userId_menstruationStartDate_idx" ON "public"."CycleInstance"("userId", "menstruationStartDate");

-- CreateIndex
CREATE INDEX "Phase_cycleInstanceId_phaseType_idx" ON "public"."Phase"("cycleInstanceId", "phaseType");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "public"."AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasskeyCredential" ADD CONSTRAINT "PasskeyCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CycleDefaults" ADD CONSTRAINT "CycleDefaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CycleInstance" ADD CONSTRAINT "CycleInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Phase" ADD CONSTRAINT "Phase_cycleInstanceId_fkey" FOREIGN KEY ("cycleInstanceId") REFERENCES "public"."CycleInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

