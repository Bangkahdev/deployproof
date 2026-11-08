import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuerySchema } from '../utils/validation';
import * as deployments from '../services/deployment.service';

const idSchema = z.string().uuid();

export const list = asyncHandler(async (req, res) => {
  const q = listQuerySchema.parse(req.query);
  res.json(await deployments.list(q));
});

export const detail = asyncHandler(async (req, res) => {
  const d = await deployments.getOrThrow(idSchema.parse(req.params.id));
  res.json(deployments.toDto(d));
});

export const status = asyncHandler(async (req, res) => {
  const d = await deployments.getOrThrow(idSchema.parse(req.params.id));
  res.json({
    id: d.id,
    buildStatus: d.buildStatus,
    processingStatus: d.processingStatus,
    aiStatus: d.aiStatus,
    txSignature: d.txSignature,
    errorMessage: d.errorMessage,
  });
});

export const retryAi = asyncHandler(async (req, res) => {
  const d = await deployments.retryAi(idSchema.parse(req.params.id));
  res.status(202).json({ success: true, message: 'AI analysis queued', data: deployments.toDto(d) });
});

export const retryBlockchain = asyncHandler(async (req, res) => {
  const d = await deployments.retryBlockchain(idSchema.parse(req.params.id));
  res.status(202).json({ success: true, message: 'Blockchain recording queued', data: deployments.toDto(d) });
});

export const stats = asyncHandler(async (_req, res) => {
  res.json(await deployments.stats());
});
