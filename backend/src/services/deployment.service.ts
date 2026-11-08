import { Prisma, type Deployment } from '@prisma/client';
import { prisma } from '../database/client';
import { AppError } from '../utils/errors';
import { explorerUrl } from '../utils/memo';
import { sanitizeLogs } from '../utils/sanitize';
import type { WebhookInput } from '../utils/validation';

export function toDto(d: Deployment) {
  let aiAnalysis: unknown = null;
  if (d.aiAnalysis) {
    try {
      aiAnalysis = JSON.parse(d.aiAnalysis);
    } catch {
      aiAnalysis = null;
    }
  }
  return {
    id: d.id,
    repoName: d.repoName,
    commitHash: d.commitHash,
    buildHash: d.buildHash,
    buildStatus: d.buildStatus,
    processingStatus: d.processingStatus,
    txSignature: d.txSignature,
    explorerUrl: d.txSignature ? explorerUrl(d.txSignature) : null,
    aiStatus: d.aiStatus,
    aiAnalysis,
    workflowRunId: d.workflowRunId,
    runAttempt: d.runAttempt,
    workflowUrl: d.workflowUrl,
    errorMessage: d.errorMessage,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/** Idempotent on (workflowRunId, runAttempt) — REQ-CI-09 / REQ-BE-05. */
export async function createFromWebhook(p: WebhookInput) {
  const isSuccess = p.status === 'success';
  try {
    const deployment = await prisma.deployment.create({
      data: {
        repoName: p.repo,
        commitHash: p.commit.toLowerCase(),
        buildHash: isSuccess ? p.buildHash!.toLowerCase() : null,
        buildStatus: isSuccess ? 'SUCCESS' : 'FAILURE',
        processingStatus: 'PENDING',
        aiStatus: isSuccess ? 'NOT_REQUIRED' : 'PENDING',
        // Raw logs are never stored; only the sanitized tail.
        sanitizedLogs: isSuccess ? null : sanitizeLogs(p.logs ?? ''),
        workflowRunId: p.workflowRunId,
        runAttempt: p.runAttempt,
        workflowUrl: p.workflowUrl ?? null,
        jobs: { create: { jobType: isSuccess ? 'BLOCKCHAIN' : 'AI_ANALYSIS' } },
      },
    });
    return { duplicate: false as const, deployment };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const existing = await prisma.deployment.findUnique({
        where: {
          repoName_workflowRunId_runAttempt: {
            repoName: p.repo,
            workflowRunId: p.workflowRunId,
            runAttempt: p.runAttempt,
          },
        },
      });
      if (existing) return { duplicate: true as const, deployment: existing };
    }
    throw e;
  }
}

export async function list(q: {
  page: number;
  limit: number;
  status?: string;
  processingStatus?: string;
  repo?: string;
}) {
  const where: Prisma.DeploymentWhereInput = {
    ...(q.status ? { buildStatus: q.status } : {}),
    ...(q.processingStatus ? { processingStatus: q.processingStatus } : {}),
    ...(q.repo ? { repoName: { contains: q.repo } } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.deployment.count({ where }),
    prisma.deployment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { items: rows.map(toDto), page: q.page, limit: q.limit, total };
}

export async function getOrThrow(id: string) {
  const d = await prisma.deployment.findUnique({ where: { id } });
  if (!d) throw new AppError(404, 'Deployment not found');
  return d;
}

export async function stats() {
  const [total, success, failure, verified] = await prisma.$transaction([
    prisma.deployment.count(),
    prisma.deployment.count({ where: { buildStatus: 'SUCCESS' } }),
    prisma.deployment.count({ where: { buildStatus: 'FAILURE' } }),
    // COMPLETED blockchain jobs only finish after the memo was read back and matched.
    prisma.deployment.count({ where: { txSignature: { not: null }, processingStatus: 'COMPLETED' } }),
  ]);
  return {
    totalDeployments: total,
    successfulBuilds: success,
    failedBuilds: failure,
    failureRate: total ? Math.round((failure / total) * 10000) / 100 : 0,
    verifiedTransactions: verified,
  };
}

export async function retryAi(id: string) {
  const d = await getOrThrow(id);
  if (d.buildStatus !== 'FAILURE') throw new AppError(409, 'AI analysis only applies to failed builds');
  if (d.aiStatus !== 'FAILED') throw new AppError(409, 'AI analysis can only be retried when it has FAILED');

  await prisma.$transaction([
    prisma.processingJob.create({ data: { deploymentId: id, jobType: 'AI_ANALYSIS' } }),
    prisma.deployment.update({
      where: { id },
      data: { aiStatus: 'PENDING', processingStatus: 'PENDING', errorMessage: null },
    }),
  ]);
  return getOrThrow(id);
}

/**
 * Re-queue a FAILED blockchain job (e.g. the wallet had no SOL the first time).
 * The existing job row is reset instead of creating a new one so a saved
 * pendingSignature is still checked first and no duplicate memo is sent.
 */
export async function retryBlockchain(id: string) {
  const d = await getOrThrow(id);
  if (d.buildStatus !== 'SUCCESS' || !d.buildHash) {
    throw new AppError(409, 'Blockchain recording only applies to successful builds with a build hash');
  }
  if (d.txSignature) throw new AppError(409, 'This deployment is already recorded on-chain');

  const job = await prisma.processingJob.findFirst({
    where: { deploymentId: id, jobType: 'BLOCKCHAIN' },
    orderBy: { createdAt: 'desc' },
  });
  if (!job || job.status !== 'FAILED') {
    throw new AppError(409, 'Blockchain recording can only be retried when its job has FAILED');
  }

  await prisma.$transaction([
    prisma.processingJob.update({
      where: { id: job.id },
      data: { status: 'PENDING', attempts: 0, lastError: null, runAfter: new Date() },
    }),
    prisma.deployment.update({ where: { id }, data: { processingStatus: 'PENDING', errorMessage: null } }),
  ]);
  return getOrThrow(id);
}
