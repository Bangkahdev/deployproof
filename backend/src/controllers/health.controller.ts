import { geminiConfigured } from '../config/env';
import { prisma } from '../database/client';
import { connection, walletAddress } from '../services/solana.service';
import { asyncHandler } from '../utils/asyncHandler';

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Only reports status; never secrets or private keys (9.5). The public wallet address is not secret. */
export const health = asyncHandler(async (_req, res) => {
  const [db, rpc] = await Promise.all([
    withTimeout(prisma.$queryRaw`SELECT 1`, 3000).then(() => 'ok', () => 'error'),
    withTimeout(connection.getVersion(), 3000).then(() => 'ok', () => 'error'),
  ]);
  const ok = db === 'ok';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    backend: 'ok',
    database: db,
    solanaRpc: rpc,
    solanaNetwork: 'devnet',
    walletAddress,
    aiProvider: geminiConfigured ? 'configured' : 'not_configured',
  });
});
