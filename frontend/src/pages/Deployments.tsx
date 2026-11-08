import { useState } from 'react';
import { AsyncView } from '../components/common/AsyncView';
import { DeploymentTable } from '../components/deployments/DeploymentTable';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';

export default function Deployments() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [repo, setRepo] = useState('');
  const [repoInput, setRepoInput] = useState('');

  const { data, loading, error } = useAsync(
    () => api.deployments({ page, limit: 20, status, repo }),
    [page, status, repo],
    (d) => d.items.some((x) => x.processingStatus === 'PENDING' || x.processingStatus === 'PROCESSING'),
  );
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Deployments</h1>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setRepo(repoInput.trim());
        }}
      >
        <input
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          placeholder="Filter by repository"
          className="w-64 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
        </select>
        <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">Apply</button>
      </form>

      <AsyncView loading={loading} error={error} hasData={!!data} empty={data?.items.length === 0} emptyText="No deployments match.">
        {data && (
          <>
            <DeploymentTable items={data.items} />
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{data.total} total</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md bg-slate-800 px-3 py-1 disabled:opacity-40">Prev</button>
                <span>{page} / {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md bg-slate-800 px-3 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </AsyncView>
    </div>
  );
}
