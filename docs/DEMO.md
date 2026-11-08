# Demo script (about 5 minutes)

Prepare: backend and frontend running, wallet funded (Settings shows Solana RPC `ok`), repo connected, Explorer tab open on Devnet.

## Scenario A: verified deployment
1. Push a commit. Show the Actions run packaging `dist.zip` and printing its SHA-256.
2. Dashboard: the new row moves PENDING → PROCESSING → COMPLETED.
3. Open the detail page, then the **Solana Explorer** link: point at the memo (app, repo, commit, hash).
4. Click the build hash → **Verifier** → `VERIFIED`. Say plainly: this proves the hash was recorded by DeployProof's wallet, not that it runs in production.
5. Change one character of the hash → `NOT_FOUND`.

## Scenario B: AI failure analysis
1. Push a commit that breaks the build. The GitHub job stays red.
2. Row shows `FAILURE`; open it: error, root cause, solutions, confidence. Mention logs were redacted first and AI cannot run anything.

## Resilience (pick one)
- Replay the same webhook: still one record.
- Empty wallet → `FAILED` → fund it → **Retry recording**.

## What judges should see
Solana really used · transaction really recorded · SHA-256 really computed from the artifact · verifier reads on-chain data · AI really analyzes logs · dashboard data comes from the backend.
