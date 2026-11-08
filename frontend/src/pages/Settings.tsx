import { useState } from 'react';
import { AsyncView } from '../components/common/AsyncView';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { api, getApiKey, setApiKey } from '../services/api';

export default function Settings() {
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  const health = useAsync(() => api.health(), []);
  const h = health.data;
  const ok = (v?: string) => (v === 'ok' || v === 'configured' ? 'COMPLETED' : 'FAILED');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Settings</h1>

      <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="font-medium text-slate-100">Dashboard API key</h2>
        <p className="text-sm text-slate-400">Stored only in this browser. Must match <span className="mono">DASHBOARD_API_KEY</span> on the backend.</p>
        <div className="flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false); }}
            className="mono flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            aria-label="Dashboard API key"
          />
          <button onClick={() => { setApiKey(key.trim()); setSaved(true); }} className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500">Save</button>
        </div>
        {saved && <p className="text-xs text-emerald-300">Saved.</p>}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="font-medium text-slate-100">System status</h2>
        <AsyncView loading={health.loading} error={health.error} hasData={!!h}>
          {h && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Backend</dt><dd><StatusBadge value={ok(h.backend)} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Database</dt><dd><StatusBadge value={ok(h.database)} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Solana RPC ({h.solanaNetwork})</dt><dd><StatusBadge value={ok(h.solanaRpc)} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">AI provider</dt><dd><StatusBadge value={ok(h.aiProvider)} /></dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-400">Wallet</dt><dd className="mono break-all text-right text-xs">{h.walletAddress}</dd></div>
            </dl>
          )}
        </AsyncView>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
        <h2 className="font-medium text-slate-100">Webhook configuration</h2>
        <p>Endpoint: <span className="mono">POST &lt;your-public-backend-url&gt;/api/webhook/deployment</span></p>
        <p>Header: <span className="mono">x-webhook-secret</span> (set it as the <span className="mono">DEPLOYPROOF_WEBHOOK_SECRET</span> GitHub Actions secret).</p>
        <p>Use <span className="mono">examples/github-actions.yml</span> as the workflow template. Secrets are never shown here.</p>
      </section>
    </div>
  );
}
