import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';

// Usage: npm run webhook:test -- success|failure
const mode = process.argv[2] === 'failure' ? 'failure' : 'success';
const base = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const runId = String(Date.now());

const payload =
  mode === 'success'
    ? {
        repo: 'demo/deployproof',
        commit: randomBytes(20).toString('hex'),
        buildHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
        status: 'success',
        workflowRunId: runId,
        runAttempt: 1,
        workflowUrl: `https://github.com/demo/deployproof/actions/runs/${runId}`,
      }
    : {
        repo: 'demo/deployproof',
        commit: randomBytes(20).toString('hex'),
        status: 'failure',
        workflowRunId: runId,
        runAttempt: 1,
        workflowUrl: `https://github.com/demo/deployproof/actions/runs/${runId}`,
        logs: 'npm ERR! code ERESOLVE\nnpm ERR! ERESOLVE could not resolve\nnpm ERR! peer react@"^17" from some-lib@2.0.0\nnpm ERR! Found: react@18.3.1',
      };

async function main() {
  const res = await fetch(`${base}/api/webhook/deployment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': process.env.WEBHOOK_SECRET ?? '' },
    body: JSON.stringify(payload),
  });
  console.log(res.status, await res.text());
  if (mode === 'success') console.log('buildHash:', (payload as { buildHash: string }).buildHash);
}
void main();
