import { Router } from 'express';
import * as deployment from '../controllers/deployment.controller';
import { health } from '../controllers/health.controller';
import { verify } from '../controllers/verify.controller';
import { receiveDeployment } from '../controllers/webhook.controller';
import { dashboardAuth, webhookAuth } from '../middleware/auth';
import { apiLimiter, verifyLimiter, webhookLimiter } from '../middleware/rateLimit';

export const router = Router();

// Public
router.get('/health', health);
router.get('/verify/:hash', verifyLimiter, verify);

// CI/CD webhook (shared secret)
router.post('/webhook/deployment', webhookLimiter, webhookAuth, receiveDeployment);

// Dashboard management API (API key)
router.get('/dashboard/stats', apiLimiter, dashboardAuth, deployment.stats);
router.get('/deployments', apiLimiter, dashboardAuth, deployment.list);
router.get('/deployments/:id', apiLimiter, dashboardAuth, deployment.detail);
router.get('/deployments/:id/status', apiLimiter, dashboardAuth, deployment.status);
router.post('/deployments/:id/retry-ai', apiLimiter, dashboardAuth, deployment.retryAi);
router.post('/deployments/:id/retry-blockchain', apiLimiter, dashboardAuth, deployment.retryBlockchain);
