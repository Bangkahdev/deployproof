import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionExpiredBlockheightExceededError,
  TransactionInstruction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import type { Deployment, ProcessingJob } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../database/client';
import { PermanentError, WaitError } from '../utils/errors';
import {
  MEMO_PROGRAM_ID,
  buildMemoPayload,
  memoMatches,
  parseMemo,
  serializeMemo,
  type MemoExpectation,
} from '../utils/memo';

export const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');
// The ONLY place the private key is loaded (NFR-SEC-01).
const payer = Keypair.fromSecretKey(Buffer.from(env.SOLANA_PRIVATE_KEY_BASE64, 'base64'));
const memoProgram = new PublicKey(MEMO_PROGRAM_ID);

export const walletAddress = payer.publicKey.toBase58();
const MIN_LAMPORTS = 10_000; // tx fee is 5000 lamports

// Signers whose memos count as "recorded by DeployProof": the current wallet plus optional older wallets.
const trustedSigners = new Set<string>([
  walletAddress,
  ...(env.TRUSTED_SIGNER_ADDRESSES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]);

export type OnChainResult =
  | { status: 'OK' }
  | { status: 'NOT_FOUND' }
  | { status: 'FAILED'; reason: string };

/**
 * Fetch a transaction and check it against the stored deployment metadata (REQ-SOL-08 / 8.5).
 * Throws on RPC problems so callers can map that to "unavailable" / retry.
 */
export async function readOnChainMemo(signature: string, expected: MemoExpectation): Promise<OnChainResult> {
  const tx = await connection.getParsedTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { status: 'NOT_FOUND' };
  if (tx.meta?.err) return { status: 'FAILED', reason: 'Transaction has an error' };

  const signedByDeployProof = tx.transaction.message.accountKeys.some(
    (k) => k.signer && trustedSigners.has(k.pubkey.toBase58()),
  );
  if (!signedByDeployProof) return { status: 'FAILED', reason: 'Transaction was not signed by a DeployProof wallet' };

  const ix = tx.transaction.message.instructions.find((i) => i.programId.toBase58() === MEMO_PROGRAM_ID);
  if (!ix) return { status: 'FAILED', reason: 'Memo instruction not found' };

  const raw = 'parsed' in ix ? ix.parsed : null;
  if (typeof raw !== 'string') return { status: 'FAILED', reason: 'Memo could not be decoded' };

  const memo = parseMemo(raw);
  if (!memo) return { status: 'FAILED', reason: 'Memo is not a valid DeployProof payload' };
  if (!memoMatches(memo, expected)) return { status: 'FAILED', reason: 'Memo does not match deployment record' };
  return { status: 'OK' };
}

async function clearPending(jobId: string) {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { pendingSignature: null, lastValidBlockHeight: null },
  });
}

/**
 * Record a successful deployment on Solana. Returns the confirmed + verified signature.
 *
 * Safety against duplicate transactions: the signed transaction's signature is persisted
 * BEFORE it is sent. After a crash/timeout we look that signature up first and only build
 * a replacement once its blockhash has expired (13.3 Reliability).
 */
export async function processBlockchainJob(job: ProcessingJob, d: Deployment): Promise<string> {
  if (d.buildStatus !== 'SUCCESS' || !d.buildHash) {
    throw new PermanentError('Blockchain job requires a SUCCESS deployment with a build hash');
  }
  const expected: MemoExpectation = { repo: d.repoName, commit: d.commitHash, hash: d.buildHash };

  let signature = job.pendingSignature;
  let lastValid = job.lastValidBlockHeight;

  if (signature) {
    const status = (await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
    if (status?.err) {
      await clearPending(job.id);
      throw new Error('Previous transaction failed on-chain; will send a new one');
    }
    if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
      // already landed, fall through to verification
    } else if (status) {
      throw new WaitError('Transaction processed, waiting for confirmation');
    } else {
      const height = await connection.getBlockHeight('confirmed');
      if (lastValid != null && height <= lastValid) throw new WaitError('Transaction still in flight');
      await clearPending(job.id); // blockhash expired and the tx never landed: safe to replace
      signature = null;
    }
  }

  if (!signature) {
    let memo: string;
    try {
      memo = serializeMemo(buildMemoPayload(expected));
    } catch (e) {
      throw new PermanentError((e as Error).message);
    }

    const balance = await connection.getBalance(payer.publicKey, 'confirmed');
    if (balance < MIN_LAMPORTS) {
      throw new PermanentError(`Insufficient SOL in wallet ${walletAddress} (fund it from the Devnet faucet)`);
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({ feePayer: payer.publicKey, blockhash, lastValidBlockHeight }).add(
      new TransactionInstruction({
        programId: memoProgram,
        keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
        data: Buffer.from(memo, 'utf8'),
      }),
    );
    tx.sign(payer);
    const sigBytes = tx.signature;
    if (!sigBytes) throw new Error('Failed to sign transaction');
    signature = bs58.encode(sigBytes);
    lastValid = lastValidBlockHeight;

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { pendingSignature: signature, lastValidBlockHeight: lastValidBlockHeight },
    });

    await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3 });

    try {
      const res = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      if (res.value.err) {
        await clearPending(job.id);
        throw new Error('Transaction failed on-chain');
      }
    } catch (e) {
      if (e instanceof TransactionExpiredBlockheightExceededError) {
        await clearPending(job.id);
        throw new Error('Transaction expired before confirmation');
      }
      throw e;
    }
  }

  const check = await readOnChainMemo(signature, expected);
  if (check.status === 'NOT_FOUND') throw new WaitError('Confirmed transaction not yet readable');
  if (check.status === 'FAILED') throw new Error(`On-chain verification failed: ${check.reason}`);
  return signature;
}
