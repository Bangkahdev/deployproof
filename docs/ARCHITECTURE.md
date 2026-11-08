# Architecture

## Components

| Component | Responsibility |
|---|---|
| GitHub Actions | builds, hashes the artifact, reports success or failure. No wallet access |
| Backend API (Express) | authenticates and validates webhooks, stores data, serves dashboard and verifier |
| SQLite + Prisma | deployments and the persistent job queue |
| Worker (same process) | runs Solana and Gemini jobs in the background |
| Solana Devnet | public audit trail via the Memo program |
| Gemini | analyzes sanitized failure logs |
| React frontend | dashboard and public verifier |

Backend layers: `routes → controllers → services → database`, plus `workers/` and pure helpers in `utils/`.

## Success path

1. Webhook is authenticated, validated, saved with a `BLOCKCHAIN` job, answered `202`.
2. Worker claims the job atomically.
3. **Signer-first send:** build the memo transaction, sign it, **save its signature on the job**, then send and confirm.
4. Read the transaction back and check it (program, no error, signer, payload). Only then the deployment becomes `COMPLETED` and gets `txSignature`.

Failure path: webhook → logs sanitized and trimmed → `AI_ANALYSIS` job → Gemini → validated JSON saved. Failed builds never produce a transaction.

## Reliability decisions

| Problem | Decision |
|---|---|
| Crash or timeout after sending | the saved signature is checked first. A new transaction is built only after the old blockhash has expired and the old signature never landed, so no duplicate memos |
| Restart mid-job | `PROCESSING` jobs return to `PENDING` on startup |
| Job stranded by a transient DB error | the loop re-queues jobs `PROCESSING` for more than 5 minutes; claim failures are caught |
| Transaction in flight | `WaitError` re-queues in 10 s without using an attempt |
| Transient errors | up to 3 attempts, exponential backoff |
| Permanent errors (no SOL, memo too large, no Gemini key) | job `FAILED` immediately; recover with the retry endpoints |
| Duplicate webhook | unique key `(repo, run id, run attempt)`, race-safe via the DB constraint |

## Security decisions

- The wallet key is loaded in exactly one module (`solana.service.ts`), never in the frontend or workflow.
- Webhook secret and API key are compared in constant time.
- Logs are redacted (tokens, passwords, private keys, credentials in URLs, long key-like blobs), cut to the last 200 lines / 20 KB, and framed as untrusted data in the prompt. Raw logs are never stored.
- Gemini only receives text: no tools, no files, no secrets. Output is schema-validated.
- Startup refuses Mainnet, missing, or placeholder configuration.
- `errorMessage` values are scrubbed of the RPC URL (which may contain an API key) and truncated.
- Rate limits and body size limits on every endpoint group.

## Verification rules

`VERIFIED` requires: transaction found, confirmed, no error, Memo program, memo decodes, signed by a trusted DeployProof wallet, `app` matches, hash, repo and commit equal the record.

## Job states

`PENDING → PROCESSING → COMPLETED | FAILED`. Deployment `processingStatus` mirrors the active job.
