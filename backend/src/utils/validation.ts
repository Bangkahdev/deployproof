import { z } from 'zod';

export const SHA256_RE = /^[a-fA-F0-9]{64}$/;
export const isSha256 = (v: string) => SHA256_RE.test(v);

export const webhookSchema = z
  .object({
    repo: z.string().regex(/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/, 'invalid repository format'),
    commit: z.string().regex(/^[a-fA-F0-9]{40}$/, 'commit must be a 40-char SHA'),
    buildHash: z.string().regex(SHA256_RE, 'buildHash must be 64 hex chars').optional(),
    status: z
      .string()
      .transform((s) => s.toLowerCase())
      .pipe(z.enum(['success', 'failure'])),
    workflowRunId: z
      .union([z.string(), z.number()])
      .transform(String)
      .pipe(z.string().regex(/^\d{1,20}$/, 'workflowRunId must be numeric')),
    runAttempt: z.coerce.number().int().min(1).max(1000),
    workflowUrl: z
      .string()
      .url()
      .max(500)
      .refine((u) => u.startsWith('https://github.com/'), 'workflowUrl must be a GitHub URL')
      .optional(),
    logs: z.string().max(200_000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'success' && !v.buildHash) {
      ctx.addIssue({ code: 'custom', path: ['buildHash'], message: 'buildHash is required for success' });
    }
  });

export type WebhookInput = z.infer<typeof webhookSchema>;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['SUCCESS', 'FAILURE']).optional(),
  processingStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  repo: z.string().max(200).optional(),
});
