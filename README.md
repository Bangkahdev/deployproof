# DeployProof

**Every Deployment Deserves Proof.**

DeployProof records a SHA-256 fingerprint of every successful build on **Solana Devnet** and lets anyone verify it publicly. When a pipeline fails, it asks **Gemini** to explain why.

```
GitHub Actions ──webhook──▶ Backend ──▶ SQLite + job queue ──▶ Worker ──▶ Solana Memo (success)
                                                                       └──▶ Gemini analysis (failure)
Anyone ──▶ Public verifier ──▶ Backend ──▶ reads the Solana transaction and compares it
```

> Status: MVP per PRD/SRS v1.0.0. Devnet only (Mainnet RPC URLs are rejected at startup).
> Read [Honest status](#honest-status) before presenting it as finished.

## Table of Contents

- [What it proves](#what-it-proves-and-what-it-does-not)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [API](#api)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Honest Status](#honest-status)

## What it proves (and what it does not)

| It proves | It does not prove |
|---|---|
| A DeployProof wallet recorded *this repo + commit + artifact hash* on Solana at a point in time | That the artifact is running in production |
| The hash on-chain matches the record DeployProof indexed | That the build is reproducible |
| The memo was signed by a DeployProof wallet (not just anyone) | Anything about hashes DeployProof never indexed (no chain-wide scan) |

## Features

- ✅ **Webhook Intake**: GitHub Actions → Express backend, with shared secret authentication
- ✅ **Idempotency**: Unique key on `(repo, run id, run attempt)` prevents duplicate processing
- ✅ **Job Queue**: SQLite-backed persistent queue with retry logic and exponential backoff
- ✅ **Solana Memo**: Signs and sends SHA-256 hash via Solana Memo program on Devnet
- ✅ **Verifier**: Public endpoint to verify artifact hashes against blockchain records
- ✅ **Gemini AI**: Analyzes sanitized failure logs to provide root cause analysis
- ✅ **Dashboard**: Manage deployments, view stats, retry failed jobs
- ✅ **Security**: Log sanitization, constant-time secrets, rate limiting, body size limits

## Architecture

### Components

| Component | Responsibility |
|---|---|
| GitHub Actions | builds, hashes the artifact, reports success or failure. No wallet access |
| Backend API (Express) | authenticates and validates webhooks, stores data, serves dashboard and verifier |
| SQLite + Prisma | deployments and the persistent job queue |
| Worker (same process) | runs Solana and Gemini jobs in the background |
| Solana Devnet | public audit trail via the Memo program |
| Gemini | analyzes sanitized failure logs |
| React frontend | dashboard and public verifier |

### Backend Layers

```
routes → controllers → services → database
    ↓
workers/
utils/ (pure helpers)
```

### Success Path

1. Webhook is authenticated, validated, saved with a `BLOCKCHAIN` job, answered `202`.
2. Worker claims the job atomically.
3. **Signer-first send**: build the memo transaction, sign it, **save its signature on the job**, then send and confirm.
4. Read the transaction back and check it (program, no error, signer, payload). Only then the deployment becomes `COMPLETED` and gets `txSignature`.

### Failure Path

Webhook → logs sanitized and trimmed → `AI_ANALYSIS` job → Gemini → validated JSON saved. Failed builds never produce a transaction.

### Reliability

| Problem | Decision |
|---|---|
| Crash or timeout after sending | the saved signature is checked first. A new transaction is built only after the old blockhash has expired and the old signature never landed, so no duplicate memos |
| Restart mid-job | `PROCESSING` jobs return to `PENDING` on startup |
| Job stranded by a transient DB error | the loop re-queues jobs `PROCESSING` for more than 5 minutes; claim failures are caught |
| Transaction in flight | `WaitError` re-queues in 10 s without using an attempt |
| Transient errors | up to 3 attempts, exponential backoff |
| Permanent errors (no SOL, memo too large, no Gemini key) | job `FAILED` immediately; recover with the retry endpoints |

## Tech Stack

- **Backend**: Node.js 20+, Express, TypeScript, Prisma (SQLite), Zod
- **Blockchain**: @solana/web3.js v1, Solana Devnet Memo program
- **AI**: Gemini API (REST `generateContent` via native fetch), model `gemini-3.5-flash-lite`
- **Frontend**: React 18, Vite, Tailwind CSS 4, React Router 6
- **Testing**: Vitest (backend)

## Screenshots

Capture the dashboard, deployments, detail, verifier, and settings views before submission and place them under `docs/screenshots/`. See [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) for the capture checklist and naming guide.

## Getting Started

### 5-minute start (Windows PowerShell)

Needs Node.js 20+. Details and Docker are in [docs/SETUP.md](docs/SETUP.md).

```powershell
Copy-Item .env.example backend\.env
cd backend
npm install
npm run wallet:new
```

Put the printed `SOLANA_PRIVATE_KEY_BASE64=...` line and two random secrets (`WEBHOOK_SECRET`, `DASHBOARD_API_KEY`) into `backend\.env`, then:

```powershell
npx prisma migrate deploy
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 → **Settings** → enter your `DASHBOARD_API_KEY`. Then fire test events:

```powershell
cd backend
npm run webhook:test -- success
npm run webhook:test -- failure
```

## Installation

### Prerequisites

- Node.js 20+
- npm 10+
- SQLite3 support (Prisma handles this)
- Docker (optional, for containerized deployment)

### Step 1: Clone the repository

```bash
git clone https://github.com/Bangkahdev/deployproof.git
cd deployproof
```

### Step 2: Install backend dependencies

```bash
cd backend
npm install
```

### Step 3: Set up environment variables

```bash
cp .env.example .env
```

Update the following:

- `DATABASE_URL`: SQLite path (default: `file:./dev.db`)
- `WEBHOOK_SECRET`: ≥16 characters (GitHub sends in `x-webhook-secret`)
- `DASHBOARD_API_KEY`: ≥16 characters (for dashboard API access)
- `SOLANA_PRIVATE_KEY_BASE64`: Base64 of 64-byte secret key
- `SOLANA_NETWORK`: `devnet` (Mainnet is rejected)
- `SOLANA_RPC_URL`: Solana Devnet RPC URL
- `GEMINI_API_KEY`: Gemini API key (optional)
- `GEMINI_MODEL`: `gemini-3.5-flash-lite`
- `FRONTEND_URL`: Frontend URL (default: `http://localhost:5173`)

### Step 4: Create and fund Solana wallet

```bash
npm run wallet:new
```

### Step 5: Run database migrations

```bash
npx prisma migrate deploy
```

### Step 6: Start backend

```bash
npm run dev
```

### Step 7: Start frontend

```bash
cd ../frontend
npm install
npm run dev
```

## Usage

### Dashboard

1. Open http://localhost:5173
2. Go to **Settings** and enter your `DASHBOARD_API_KEY`
3. View deployment statistics
4. View deployment list and details
5. Retry failed AI analysis or blockchain jobs

### Public Verifier

1. Open the **Verifier** page
2. Enter the artifact SHA-256 hash
3. The backend queries the blockchain record and compares
4. Results show `VERIFIED` or `NOT_FOUND`

### Webhook

Send a POST to `/api/webhook/deployment` with:

```json
{
  "repo": "owner/repository",
  "commit": "abc123",
  "buildHash": "sha256-hash",
  "status": "success",
  "workflowRunId": "123",
  "runAttempt": 1,
  "workflowUrl": "https://github.com/..."
}
```

### Retry Endpoints

- `POST /api/deployments/:id/retry-ai` - Retry AI analysis
- `POST /api/deployments/:id/retry-blockchain` - Retry blockchain recording

## Testing

### Automated Tests

```bash
cd backend
npm test
```

- `tests/sanitize.test.ts`: secret redaction, 200-line and 20 KB limits, ANSI stripping
- `tests/memo.test.ts`: memo serialization, 500-byte limit, matching, explorer URL
- `tests/validation.test.ts`: webhook payload rules, SHA-256 format

### Manual End-to-End Checklist

See [docs/TESTING.md](docs/TESTING.md) for the complete checklist.

### Commands

```bash
# Backend
cd backend
npm run typecheck    # TypeScript type checking
npm test             # Run unit tests
npm run dev          # Start development server

# Frontend
cd frontend
npm run build        # Production build
npm run dev          # Start dev server
```

## API

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/health` | Health check | None |
| GET | `/api/verify/:hash` | Verify artifact hash | Rate Limited |
| POST | `/api/webhook/deployment` | Webhook intake | Shared Secret |
| GET | `/api/dashboard/stats` | Dashboard stats | API Key |
| GET | `/api/deployments` | List deployments | API Key |
| GET | `/api/deployments/:id` | Get deployment | API Key |
| POST | `/api/deployments/:id/retry-ai` | Retry AI | API Key |
| POST | `/api/deployments/:id/retry-blockchain` | Retry Blockchain | API Key |

See [docs/API.md](docs/API.md) for full API documentation.

## Documentation

| Doc | Read it to |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | install, configure and run locally or with Docker |
| [docs/GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md) | connect a repository |
| [docs/API.md](docs/API.md) | call the API |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | understand how it works and why |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | retries, wallet rotation, troubleshooting |
| [docs/TESTING.md](docs/TESTING.md) | what is tested, and the manual end-to-end checklist |
| [docs/DEMO.md](docs/DEMO.md) | run the hackathon demo |

## Deployment

### Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3000

### GitHub Actions

Copy `examples/github-actions.yml` to `.github/workflows/deployproof.yml` in your repository and adapt.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the tests

## Honest Status

Written against the SRS and reviewed, but **not yet run end-to-end**: the environment it was written in had no network access. Unit-tested offline: log sanitization and memo size limits (manually executed). Not yet verified: `npm install`/build, the full test suite, Docker, a real Devnet transaction, a real Gemini call. Run the checklist in [docs/TESTING.md](docs/TESTING.md) before submission.

### Known limitations

- Devnet is not permanent storage and RPC providers can be down (the verifier then answers `VERIFICATION_UNAVAILABLE`)
- The dashboard API key lives in browser localStorage (use real auth beyond the MVP)
- The initial Prisma migrations are hand-written

### Roadmap

Multi-tenant auth, GitLab/Bitbucket, custom Solana program, SLSA provenance and signed attestations, failure-pattern analysis.

## License

MIT
