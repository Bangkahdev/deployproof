# Operations

## Retrying failed work

| Situation | Action |
|---|---|
| Dashboard shows a successful build as `FAILED` ("Insufficient SOL") | fund the wallet from the Devnet faucet, then **Retry recording** on the detail page, or `POST /api/deployments/:id/retry-blockchain` |
| AI analysis shows `FAILED` | check `GEMINI_API_KEY` / `GEMINI_MODEL`, then **Retry analysis** or `POST /api/deployments/:id/retry-ai` |

```powershell
curl.exe -X POST -H "x-api-key: YOUR_KEY" http://localhost:3000/api/deployments/DEPLOYMENT_ID/retry-blockchain
```

Retrying a blockchain job reuses the same job row, so a previously saved signature is checked before anything is re-sent.

## Rotating the wallet

Verification requires memos to be signed by a trusted wallet. After switching `SOLANA_PRIVATE_KEY_BASE64`, old proofs would fail the signer check. Keep them valid by listing the old public address(es) in `TRUSTED_SIGNER_ADDRESSES` (comma-separated). Never put private keys there.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Backend exits at startup listing variables | missing/placeholder env value, non-64-byte key, or Mainnet URL |
| `401` from the dashboard | API key not set in Settings, or differs from `DASHBOARD_API_KEY` |
| `401` from GitHub | `DEPLOYPROOF_WEBHOOK_SECRET` differs from `WEBHOOK_SECRET` |
| GitHub cannot reach the backend | backend not on public HTTPS |
| Rows stay `PENDING` | worker retrying or waiting; check backend logs for `[worker]` lines and `/api/health` |
| Rows `FAILED` with "Insufficient SOL" | fund wallet, then retry |
| Verifier says `VERIFICATION_UNAVAILABLE` | RPC unreachable or record not complete; retry later |
| Verifier says `VERIFICATION_FAILED` "not signed by a DeployProof wallet" | wallet rotated; add old address to `TRUSTED_SIGNER_ADDRESSES` |
| Prisma reports drift | use a fresh database, or `npx prisma migrate dev` (the initial migrations are hand-written) |

## Backups

Everything lives in one SQLite file (`dev.db`, or the `dbdata` volume in Docker). Copy it while the backend is stopped.
