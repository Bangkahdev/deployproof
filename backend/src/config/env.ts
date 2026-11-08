import 'dotenv/config';
import { z } from 'zod';

const notPlaceholder = (v: string) => !v.startsWith('replace_with');

const secret = z
  .string()
  .min(16, 'must be at least 16 characters')
  .refine(notPlaceholder, 'still contains the placeholder value');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().min(1),
    WEBHOOK_SECRET: secret,
    DASHBOARD_API_KEY: secret,
    SOLANA_NETWORK: z.literal('devnet', {
      errorMap: () => ({ message: 'only "devnet" is allowed in this MVP' }),
    }),
    SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
    SOLANA_PRIVATE_KEY_BASE64: z
      .string()
      .refine(notPlaceholder, 'still contains the placeholder value')
      .refine((v) => Buffer.from(v, 'base64').length === 64, 'must be base64 of a 64-byte secret key'),
    // Extra public keys accepted as memo signers (e.g. a previous wallet after rotation). Comma-separated.
    TRUSTED_SIGNER_ADDRESSES: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  })
  .refine((e) => !/mainnet/i.test(e.SOLANA_RPC_URL), {
    path: ['SOLANA_RPC_URL'],
    message: 'mainnet RPC endpoints are not allowed',
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join('.') || 'env'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const geminiConfigured = !!env.GEMINI_API_KEY && notPlaceholder(env.GEMINI_API_KEY);
