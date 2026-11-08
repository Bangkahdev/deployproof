-- Run IDs are only unique per repository, so the idempotency key must include the repository.
-- DropIndex
DROP INDEX "Deployment_workflowRunId_runAttempt_key";

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_repoName_workflowRunId_runAttempt_key" ON "Deployment"("repoName", "workflowRunId", "runAttempt");
