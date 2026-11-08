import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';
import type { VerifyResponse } from '../types';

const HASH_RE = /^[a-fA-F0-9]{64}$/;

export default function Verifier() {
  const { hash: routeHash = '' } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(routeHash);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const valid = HASH_RE.test(input.trim());

  const run = async (hash: string) => {
    setLoading(true);
    setResult(null);
    setResult(await api.verify(hash));
    setLoading(false);
  };

  useEffect(() => {
    if (HASH_RE.test(routeHash)) {
      setInput(routeHash);
      void run(routeHash);
    }
  }, [routeHash]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Public verifier</h1>
      <p className="text-sm text-slate-400">
        Paste the SHA-256 of an artifact. DeployProof looks up its deployment record, then reads the Solana Devnet
        transaction and checks the memo. No login required.
      </p>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) navigate(`/verify/${input.trim().toLowerCase()}`);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="64-character hexadecimal SHA-256"
          spellCheck={false}
          aria-label="SHA-256 hash"
          className="mono flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button disabled={!valid || loading} className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-40">
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>
      {input && !valid && <p className="text-xs text-amber-300">Hash must be exactly 64 hexadecimal characters.</p>}

      {result && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4" role="status">
          <StatusBadge value={result.status} />
          {result.status === 'VERIFIED' && result.data ? (
            <dl className="mono space-y-2 text-sm">
              <div><dt className="text-slate-400">Repository</dt><dd>{result.data.repo}</dd></div>
              <div><dt className="text-slate-400">Commit</dt><dd className="break-all">{result.data.commit}</dd></div>
              <div><dt className="text-slate-400">Network</dt><dd>{result.data.network}</dd></div>
              <div><dt className="text-slate-400">Transaction</dt><dd className="break-all">{result.data.txSignature}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-slate-300">{result.message}</p>
          )}
          {(result.data?.explorerUrl ?? result.explorerUrl) && (
            <a href={result.data?.explorerUrl ?? result.explorerUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-sky-300 hover:underline">
              Open in Solana Explorer ↗
            </a>
          )}
          {result.status === 'VERIFIED' && (
            <p className="text-xs text-slate-500">
              This proves the hash and metadata were recorded on-chain by DeployProof. It does not prove the artifact is running in production.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
