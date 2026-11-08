# Setup

## Requirements
- Node.js 20+
- A Solana **Devnet** wallet with a little SOL (each memo costs about 0.000005 SOL)
- Optional: a Gemini API key (without it, failure analysis jobs end as `FAILED` and can be retried later)
- Optional: Docker Desktop

## 1. Configure

Windows PowerShell (older versions do not support `&&`, so run commands one per line):

```powershell
Copy-Item .env.example backend\.env
```

| Variable | Required | Meaning |
|---|---|---|
| `DATABASE_URL` | yes | SQLite path, `file:./dev.db` locally |
| `WEBHOOK_SECRET` | yes | shared secret GitHub sends in `x-webhook-secret` (≥16 chars) |
| `DASHBOARD_API_KEY` | yes | protects the management API (≥16 chars) |
| `SOLANA_NETWORK` | yes | must be `devnet` |
| `SOLANA_RPC_URL` | no | default `https://api.devnet.solana.com` (Mainnet URLs are rejected) |
| `SOLANA_PRIVATE_KEY_BASE64` | yes | base64 of the 64-byte secret key |
| `TRUSTED_SIGNER_ADDRESSES` | no | extra accepted memo signers (see [OPERATIONS](OPERATIONS.md#rotating-the-wallet)) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | no | AI analysis. Check Google's docs for current model names |
| `FRONTEND_URL` | no | allowed CORS origin, default `http://localhost:5173` |

Generate a random secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The backend refuses to start on missing or placeholder values and prints which ones.

## 2. Create and fund the wallet

```powershell
cd backend
npm install
npm run wallet:new
```

It prints the address and the `SOLANA_PRIVATE_KEY_BASE64=` line, and tries a 1 SOL airdrop. If the airdrop is rate limited, use https://faucet.solana.com with the printed address. Use this wallet for Devnet only and never commit it.

## 3. Run locally

```powershell
npx prisma migrate deploy
npm run dev
```

Backend: http://localhost:3000. Check http://localhost:3000/api/health (database `ok`, Solana RPC `ok`).

```powershell
cd ..\frontend
npm install
npm run dev
```

Dashboard: http://localhost:5173. Open **Settings** and paste `DASHBOARD_API_KEY`.

## 4. Docker

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Edit `.env` first. Frontend http://localhost:8080, backend http://localhost:3000. SQLite is stored in the `dbdata` volume and migrations run on container start. Only the backend gets the secrets.

## 5. Smoke test

```powershell
cd backend
npm run webhook:test -- success
```

The row should go PENDING → PROCESSING → COMPLETED with a transaction link. Copy the printed `buildHash` into the **Verifier** page.
