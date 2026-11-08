import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AsyncView } from '../components/common/AsyncView';
import { StatCard } from '../components/dashboard/StatCard';
import { DeploymentTable } from '../components/deployments/DeploymentTable';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';

export default function Dashboard() {
  const stats = useAsync(() => api.stats(), []);
  const recent = useAsync(
    () => api.deployments({ limit: 8 }),
    [],
    (d) => d.items.some((x) => x.processingStatus === 'PENDING' || x.processingStatus === 'PROCESSING'),
  );

  // Refresh the counters whenever the recent list refreshes (it polls while jobs are running).
  const { reload: reloadStats } = stats;
  useEffect(() => {
    if (recent.data) reloadStats();
  }, [recent.data, reloadStats]);

  const s = stats.data;
  const okPct = s && s.totalDeployments ? Math.round((s.successfulBuilds / s.totalDeployments) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Overview</h1>

      <AsyncView loading={stats.loading} error={stats.error} hasData={!!s}>
        {s && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard label="Total" value={s.totalDeployments} />
              <StatCard label="Successful" value={s.successfulBuilds} />
              <StatCard label="Failed" value={s.failedBuilds} />
              <StatCard label="Failure rate" value={`${s.failureRate}%`} />
              <StatCard label="On-chain verified" value={s.verifiedTransactions} hint="Memo read back & matched" />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Success / failure distribution</div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-800" role="img" aria-label={`${okPct}% successful`}>
                <div className="bg-emerald-500" style={{ width: `${okPct}%` }} />
                <div className="bg-rose-500" style={{ width: s.totalDeployments ? `${100 - okPct}%` : '0%' }} />
              </div>
            </div>
          </>
        )}
      </AsyncView>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-100">Recent deployments</h2>
          <Link to="/deployments" className="text-sm text-sky-300 hover:underline">View all</Link>
        </div>
        <AsyncView
          loading={recent.loading}
          error={recent.error}
          hasData={!!recent.data}
          empty={recent.data?.items.length === 0}
          emptyText="No deployments yet. Send a webhook from GitHub Actions to get started."
        >
          {recent.data && <DeploymentTable items={recent.data.items} />}
        </AsyncView>
      </section>
    </div>
  );
}
