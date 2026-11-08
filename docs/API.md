# API

Base path `/api`. Three access levels:

| Level | Header | Endpoints |
|---|---|---|
| Public | none | `GET /health`, `GET /verify/:hash` |
| Webhook | `x-webhook-secret` | `POST /webhook/deployment` |
| Management | `x-api-key` | everything under `/deployments` and `/dashboard` |

Errors never include stack traces or secrets. Validation errors return `400` with `errors[]`. Body limit 256 KB. Rate limits per IP: webhook 60/min, verify 30/min, management 240/min.

## POST /webhook/deployment

```json
{
  "repo": "owner/name",
  "commit": "<40 hex>",
  "buildHash": "<64 hex, required when status is success>",
  "status": "success",
  "workflowRunId": "123456789",
  "runAttempt": 1,
  "workflowUrl": "https://github.com/owner/name/actions/runs/123456789",
  "logs": "only for status failure"
}
```

| Result | When |
|---|---|
| `202` + `deploymentId`, `buildStatus`, `processingStatus: PENDING` | accepted |
| `200` "Webhook already processed" | same repo + run id + attempt seen before |
| `400` | invalid payload |
| `401` | wrong or missing secret |

## Management endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/deployments` | `page`, `limit` (≤100), `status` (SUCCESS/FAILURE), `processingStatus`, `repo`. Returns `{items,page,limit,total}` |
| GET | `/deployments/:id` | full detail incl. `aiAnalysis`, `explorerUrl` |
| GET | `/deployments/:id/status` | processing, AI status and error only |
| POST | `/deployments/:id/retry-ai` | `202`. Only when `aiStatus` is `FAILED`. Otherwise `409` |
| POST | `/deployments/:id/retry-blockchain` | `202`. Only for a SUCCESS deployment with no signature whose blockchain job is `FAILED`. Otherwise `409` |
| GET | `/dashboard/stats` | `totalDeployments, successfulBuilds, failedBuilds, failureRate, verifiedTransactions` |

Statuses: `buildStatus` SUCCESS/FAILURE · `processingStatus` PENDING/PROCESSING/COMPLETED/FAILED · `aiStatus` PENDING/COMPLETED/FAILED/NOT_REQUIRED.

## GET /verify/:hash (public)

`:hash` must be 64 hex characters (`400` otherwise).

| HTTP | `status` | Meaning |
|---|---|---|
| 200 | `VERIFIED` | transaction fetched, confirmed, no error, Memo program, signed by a DeployProof wallet, payload matches repo/commit/hash |
| 404 | `NOT_FOUND` | DeployProof has no record of this hash |
| 422 | `VERIFICATION_FAILED` | transaction found but something does not match (reason in `message`) |
| 503 | `VERIFICATION_UNAVAILABLE` | RPC unreachable, or the on-chain record is not complete yet |

Presence in SQLite alone never yields `VERIFIED`.

## GET /health

`{status, backend, database, solanaRpc, solanaNetwork, walletAddress, aiProvider}`. `walletAddress` is the public key. No secrets are returned. `503` if the database is down.

## On-chain memo

Program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`, UTF-8 JSON, ≤500 bytes (enforced with `Buffer.byteLength` before sending):

```json
{"app":"DEPLOYPROOF","v":1,"repo":"owner/name","commit":"<40 hex>","hash":"<64 hex>","ts":"2026-11-08T13:00:00.000Z"}
```

No logs, keys or secrets are ever written to the memo.
