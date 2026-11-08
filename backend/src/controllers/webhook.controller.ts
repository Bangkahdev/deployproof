import { asyncHandler } from '../utils/asyncHandler';
import { webhookSchema } from '../utils/validation';
import * as deployments from '../services/deployment.service';

export const receiveDeployment = asyncHandler(async (req, res) => {
  const payload = webhookSchema.parse(req.body);
  const result = await deployments.createFromWebhook(payload);

  if (result.duplicate) {
    return res.status(200).json({
      success: true,
      message: 'Webhook already processed',
      data: { deploymentId: result.deployment.id },
    });
  }
  return res.status(202).json({
    success: true,
    message: 'Deployment accepted for processing',
    data: {
      deploymentId: result.deployment.id,
      buildStatus: result.deployment.buildStatus,
      processingStatus: result.deployment.processingStatus,
    },
  });
});
