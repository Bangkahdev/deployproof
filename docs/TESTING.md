# Testing

## Automated (vitest)

```powershell
cd backend
npm test
```

| File | Covers |
|---|---|
| `tests/sanitize.test.ts` | secret redaction, 200-line and 20 KB limits, ANSI stripping |
| `tests/memo.test.ts` | memo serialization, 500-byte limit, matching, explorer URL |
| `tests/validation.test.ts` | webhook payload rules, SHA-256 format |

**Not covered automatically yet:** worker and job queue, Prisma transactions and the idempotency constraint, the Solana service, the Gemini service, the HTTP API. Those need a database and network (or mocks) and are covered by the manual checklist below.

## Manual end-to-end checklist

Run this on a machine with internet before calling the MVP done.

**Build**
- [ ] `npm install` and `npm run typecheck` pass in `backend`
- [ ] `npm test` passes
- [ ] `npm install` and `npm run build` pass in `frontend`
- [ ] `docker compose up --build` starts both services

**Success chain** (GitHub Actions → Backend → Solana → Verifier)
- [ ] Real workflow run sends the webhook, backend answers `202`
- [ ] Row reaches `COMPLETED` with a signature
- [ ] The Explorer link shows the memo with the right repo, commit and hash
- [ ] Verifier shows `VERIFIED` for the artifact hash (`sha256sum dist.zip` locally gives the same value)
- [ ] Verifier shows `NOT_FOUND` for a random hash

**Failure chain**
- [ ] Broken build sends the failure webhook; job still fails in GitHub
- [ ] Packaging failure (delete `dist` step) also sends a failure webhook
- [ ] AI panel shows error, root cause, solutions, confidence; no transaction exists

**Resilience**
- [ ] Same webhook twice → one record, one transaction
- [ ] Same run id + attempt from two different repos → two records
- [ ] Stop the backend while a row is `PROCESSING`, restart → it completes, no duplicate transaction
- [ ] Empty wallet → `FAILED`; fund it; **Retry recording** → `COMPLETED`
- [ ] Wrong `GEMINI_API_KEY` → AI `FAILED`; fix; **Retry analysis** works
- [ ] Wrong webhook secret → `401`; Mainnet RPC URL → backend refuses to start

**Security**
- [ ] No `.env`, keypair or key in the repo or frontend bundle
- [ ] Credentials in a failing log appear as `[REDACTED...]` in the stored/analyzed text
- [ ] Wrong hash length → `400`; API without key → `401`
