import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { prisma } from './database/client';
import { errorHandler, notFound } from './middleware/error';
import { router } from './routes';
import { walletAddress } from './services/solana.service';
import { startWorker, stopWorker } from './workers/worker';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, allowedHeaders: ['Content-Type', 'x-api-key', 'x-webhook-secret'] }));
app.use(express.json({ limit: '256kb' }));
app.use('/api', router);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`DeployProof backend listening on :${env.PORT} (Solana devnet, wallet ${walletAddress})`);
  startWorker();
});

async function shutdown() {
  stopWorker();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
