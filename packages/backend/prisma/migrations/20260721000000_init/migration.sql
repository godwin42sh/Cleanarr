-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ScanTrigger" AS ENUM ('CRON', 'MANUAL');

-- CreateTable
CREATE TABLE "ScanRun" (
    "id" TEXT NOT NULL,
    "trigger" "ScanTrigger" NOT NULL DEFAULT 'CRON',
    "status" "ScanStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "ScanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "crossSeed" BOOLEAN NOT NULL DEFAULT false,
    "totalSizeBytes" BIGINT NOT NULL,
    "ageDays" INTEGER NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateFile" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "ageDays" INTEGER NOT NULL,
    "links" INTEGER NOT NULL,

    CONSTRAINT "CandidateFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateTorrent" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentPath" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sizeBytes" BIGINT NOT NULL,

    CONSTRAINT "CandidateTorrent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanupEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested" INTEGER NOT NULL,
    "cleaned" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "removedTorrentHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "CleanupEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanupItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "removedTorrents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletedFromDisk" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "CleanupItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScanRun_startedAt_idx" ON "ScanRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateFile_path_key" ON "CandidateFile"("path");

-- CreateIndex
CREATE INDEX "CandidateFile_candidateId_idx" ON "CandidateFile"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateTorrent_candidateId_idx" ON "CandidateTorrent"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateTorrent_candidateId_hash_key" ON "CandidateTorrent"("candidateId", "hash");

-- CreateIndex
CREATE INDEX "CleanupEvent_createdAt_idx" ON "CleanupEvent"("createdAt");

-- CreateIndex
CREATE INDEX "CleanupItem_eventId_idx" ON "CleanupItem"("eventId");

-- AddForeignKey
ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTorrent" ADD CONSTRAINT "CandidateTorrent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanupItem" ADD CONSTRAINT "CleanupItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CleanupEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

