import { prisma } from '../database/client';
import { explorerUrl } from '../utils/memo';
import { readOnChainMemo } from './solana.service';

export type VerifyStatus = 'VERIFIED' | 'NOT_FOUND' | 'VERIFICATION_FAILED' | 'VERIFICATION_UNAVAILABLE';

export interface VerifyResult {
  httpStatus: number;
  body: Record<string, unknown>;
}

/**
 * Public verification (REQ-VER-*). VERIFIED is returned ONLY when the on-chain memo
 * was fetched and matches; a row in SQLite alone is never enough (REQ-VER-07).
 */
export async function verifyHash(rawHash: string): Promise<VerifyResult> {
  const hash = rawHash.toLowerCase();

  // Prefer a record that already has a signature (the same artifact can be rebuilt).
  const record =
    (await prisma.deployment.findFirst({
      where: { buildHash: hash, buildStatus: 'SUCCESS', txSignature: { not: null } },
      orderBy: { createdAt: 'desc' },
    })) ??
    (await prisma.deployment.findFirst({
      where: { buildHash: hash, buildStatus: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    }));

  if (!record) {
    return {
      httpStatus: 404,
      body: { verified: false, status: 'NOT_FOUND', message: 'No deployment record found for this hash' },
    };
  }

  if (!record.txSignature) {
    return {
      httpStatus: 503,
      body: {
        verified: false,
        status: 'VERIFICATION_UNAVAILABLE',
        message: 'Deployment is known but its blockchain record is not complete yet',
      },
    };
  }

  const sig = record.txSignature;
  try {
    const res = await readOnChainMemo(sig, { repo: record.repoName, commit: record.commitHash, hash });
    if (res.status === 'OK') {
      return {
        httpStatus: 200,
        body: {
          verified: true,
          status: 'VERIFIED',
          data: {
            repo: record.repoName,
            commit: record.commitHash,
            buildHash: hash,
            network: 'devnet',
            txSignature: sig,
            explorerUrl: explorerUrl(sig),
          },
        },
      };
    }
    if (res.status === 'NOT_FOUND') {
      return {
        httpStatus: 503,
        body: {
          verified: false,
          status: 'VERIFICATION_UNAVAILABLE',
          message: 'Transaction could not be fetched right now',
          explorerUrl: explorerUrl(sig),
        },
      };
    }
    return {
      httpStatus: 422,
      body: { verified: false, status: 'VERIFICATION_FAILED', message: res.reason, explorerUrl: explorerUrl(sig) },
    };
  } catch {
    return {
      httpStatus: 503,
      body: {
        verified: false,
        status: 'VERIFICATION_UNAVAILABLE',
        message: 'Unable to verify transaction at this time',
        explorerUrl: explorerUrl(sig),
      },
    };
  }
}
