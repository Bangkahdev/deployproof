# Connect a repository

1. **Expose the backend over public HTTPS.** GitHub cannot call `localhost`. Use real hosting, or a tunnel while demoing.
2. **Add repository secrets** (Settings → Secrets and variables → Actions):
   - `DEPLOYPROOF_URL`: e.g. `https://deployproof.example.com` (no trailing slash)
   - `DEPLOYPROOF_WEBHOOK_SECRET`: identical to the backend's `WEBHOOK_SECRET`
3. **Copy** `examples/github-actions.yml` to `.github/workflows/deployproof.yml` and adapt the build and packaging steps to your stack.

## What the template does

| Step | Behaviour |
|---|---|
| Install / build / test | output is saved to `build.log` |
| Package + SHA-256 | hashes the artifact that was actually produced (`sha256sum dist.zip`); output saved to `package.log` |
| Success webhook | sent only if build **and** packaging succeeded |
| Failure webhook | sent if the build **or** packaging failed (`if: always()`), with the last 200 log lines |
| Final step | keeps the job red when something failed; a webhook can never turn a failed build green |

Rules to keep:
- The workflow never touches a Solana wallet. Only the backend signs.
- Hash the real artifact. For container images, record the image digest separately; do not treat a file hash and an image digest as the same thing.
- Re-running a workflow creates a new `run_attempt`, so it is recorded as a new deployment. Re-delivering the *same* attempt is ignored.
- Idempotency key is `(repository, run id, run attempt)`; GitHub run IDs are only unique within a repository.
