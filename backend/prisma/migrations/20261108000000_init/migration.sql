-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoName" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL,
    "buildHash" TEXT,
    "buildStatus" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "txSignature" TEXT,
    "aiAnalysis" TEXT,
    "aiStatus" TEXT,
    "sanitizedLogs" TEXT,
    "workflowRunId" TEXT NOT NULL,
    "runAttempt" INTEGER NOT NULL,
    "workflowUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deploymentId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "pendingSignature" TEXT,
    "lastValidBlockHeight" INTEGER,
    "runAfter" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcessingJob_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Deployment_buildHash_idx" ON "Deployment"("buildHash");

-- CreateIndex
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_workflowRunId_runAttempt_key" ON "Deployment"("workflowRunId", "runAttempt");

-- CreateIndex
CREATE INDEX "ProcessingJob_status_runAfter_idx" ON "ProcessingJob"("status", "runAfter");

-- CreateIndex
CREATE INDEX "ProcessingJob_deploymentId_idx" ON "ProcessingJob"("deploymentId");
