import type { Deployment, ProcessingJob } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../database/client';
import { analyzeLogs } from '../services/gemini.service';
import { processBlockchainJob } from '../services/solana.service';
import { PermanentError, WaitError } from '../utils/errors';

const POLL_MS = 2_000;
const MAX_ATTEMPTS = 3;
const WAIT_MS = 10_000;
const STALE_MS = 5 * 60_000; // a job PROCESSING this long without any update is considered abandoned

let running = false;

/** Never persist/log RPC URLs (they may embed API keys) or long messages. */
function safeMessage(e: unknown): string {
  let msg = e instanceof Error ? e.message : 'Unknown error';
  msg = msg.split(env.SOLANA_RPC_URL).join('[RPC_URL]');
  if (env.GEMINI_API_KEY) msg = msg.split(env.GEMINI_API_KEY).join('[REDACTED]');
  return msg.slice(0, 300);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(undefined);
    }, ms);
  });
}

export function startWorker() {
  running = true;
  void start().catch((e) => {
    console.error('[worker] fatal start error:', safeMessage(e));
  });
}

async function start() {
  let delay = 1_000;
  while (running) {
    try {
      await recover();
      loop();
      return; // loop() memegang kendali; stopWorker() akan menghentikannya
    } catch (e) {
      console.error(`[worker] recover failed, retrying in ${delay}ms:`, safeMessage(e));
      await sleep(delay);
      delay = Math.min(delay * 2, 30_000);
    }
  }
  console.log('[worker] not started (shutdown requested)');
}

export function stopWorker() {
  running = false;
}

/** Jobs left PROCESSING by a crash/restart go back to PENDING (13.3 Reliability). */
async function recover() {
  const r = await prisma.processingJob.updateMany({ where: { status: 'PROCESSING' }, data: { status: 'PENDING' } });
  if (r.count > 0) console.log(`[worker] recovered ${r.count} interrupted job(s)`);
}

/** Also runs on every loop, so a job stranded by a transient DB error is not stuck until the next restart. */
async function recoverStale() {
  const r = await prisma.processingJob.updateMany({
    where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
    data: { status: 'PENDING' },
  });
  if (r.count > 0) console.log(`[worker] re-queued ${r.count} stale job(s)`);
}

async function loop() {
  if (!running) return;
  try {
    await recoverStale();
    while (running && (await tick())) {
      /* drain queue */
    }
  } catch (e) {
    console.error('[worker] tick error:', safeMessage(e));
  }
  setTimeout(loop, POLL_MS);
}

async function tick(): Promise<boolean> {
  const candidate = await prisma.processingJob.findFirst({
    where: { status: 'PENDING', runAfter: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
  });
  if (!candidate) return false;

  // Atomic claim so two loops can never run the same job.
  const claimed = await prisma.processingJob.updateMany({
    where: { id: candidate.id, status: 'PENDING' },
    data: { status: 'PROCESSING' },
  });
  if (claimed.count === 0) return true;

  const job: ProcessingJob = { ...candidate, status: 'PROCESSING' };

  // Everything after the claim is inside try/catch so a failure here never strands the job silently.
  try {
    const deployment = await prisma.deployment.update({
      where: { id: job.deploymentId },
      data: { processingStatus: 'PROCESSING', errorMessage: null },
    });
    await run(job, deployment);
  } catch (e) {
    try {
      await handleFailure(job, e);
    } catch (inner) {
      // DB unavailable even for bookkeeping: put the job back so recovery picks it up.
      console.error('[worker] could not record failure:', safeMessage(inner));
      await prisma.processingJob
        .updateMany({ where: { id: job.id, status: 'PROCESSING' }, data: { status: 'PENDING' } })
        .catch(() => undefined);
    }
  }
  return true;
}

async function run(job: ProcessingJob, d: Deployment) {
  if (job.jobType === 'BLOCKCHAIN') {
    const signature = await processBlockchainJob(job, d);
    await prisma.$transaction([
      prisma.processingJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', lastError: null, pendingSignature: null },
      }),
      prisma.deployment.update({
        where: { id: d.id },
        data: { txSignature: signature, processingStatus: 'COMPLETED', errorMessage: null },
      }),
    ]);
    console.log(`[worker] recorded ${d.id} on Solana`);
    return;
  }

  if (job.jobType === 'AI_ANALYSIS') {
    if (d.buildStatus !== 'FAILURE') throw new PermanentError('AI analysis only applies to FAILURE builds');
    const analysis = await analyzeLogs(d.sanitizedLogs ?? '');
    await prisma.$transaction([
      prisma.processingJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', lastError: null } }),
      prisma.deployment.update({
        where: { id: d.id },
        data: {
          aiAnalysis: JSON.stringify(analysis),
          aiStatus: 'COMPLETED',
          processingStatus: 'COMPLETED',
          errorMessage: null,
        },
      }),
    ]);
    console.log(`[worker] analyzed ${d.id} with Gemini`);
    return;
  }

  throw new PermanentError(`Unknown job type ${job.jobType}`);
}

async function handleFailure(job: ProcessingJob, e: unknown) {
  const msg = safeMessage(e);

  if (e instanceof WaitError) {
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: 'PENDING', lastError: msg, runAfter: new Date(Date.now() + WAIT_MS) },
    });
    return; // deployment stays PROCESSING, no attempt consumed
  }

  const attempts = job.attempts + 1;
  const final = e instanceof PermanentError || attempts >= MAX_ATTEMPTS;
  const backoff = 5_000 * 2 ** attempts;

  await prisma.processingJob.update({
    where: { id: job.id },
    data: {
      attempts,
      lastError: msg,
      status: final ? 'FAILED' : 'PENDING',
      runAfter: new Date(Date.now() + (final ? 0 : backoff)),
    },
  });

  await prisma.deployment.update({
    where: { id: job.deploymentId },
    data: final
      ? {
          processingStatus: 'FAILED',
          errorMessage: msg,
          ...(job.jobType === 'AI_ANALYSIS' ? { aiStatus: 'FAILED' } : {}),
        }
      : { processingStatus: 'PENDING', errorMessage: msg },
  });
  console.error(`[worker] job ${job.id} (${job.jobType}) ${final ? 'failed' : 'will retry'}: ${msg}`);
}
