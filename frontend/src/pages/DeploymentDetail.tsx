import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AsyncView } from '../components/common/AsyncView';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { fmtDate } from '../utils';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="mono break-all text-sm">{children}</dd>
    </div>
  );
}

export default function DeploymentDetail() {
  const { id = '' } = useParams();
  const [retryError, setRetryError] = useState<string | null>(null);
  const { data: d, loading, error, reload } = useAsync(
    () => api.deployment(id),
    [id],
    (x) => x.processingStatus === 'PENDING' || x.processingStatus === 'PROCESSING',
  );

  const retry = async () => {
    setRetryError(null);
    try {
      await api.retryAi(id);
      reload();
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : 'Retry failed');
    }
  };

  const retryChain = async () => {
    setRetryError(null);
    try {
      await api.retryBlockchain(id);
      reload();
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : 'Retry failed');
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/deployments" className="text-sm text-sky-300 hover:underline">← Deployments</Link>
      <AsyncView loading={loading} error={error} hasData={!!d}>
        {d && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-100">{d.repoName}</h1>
              <StatusBadge value={d.buildStatus} />
              <StatusBadge value={d.processingStatus} />
            </div>

            <dl className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40 px-4">
              <Row label="Commit">{d.commitHash}</Row>
              <Row label="Build hash (SHA-256)">
                {d.buildHash ? <Link to={`/verify/${d.buildHash}`} className="text-sky-300 hover:underline">{d.buildHash}</Link> : '—'}
              </Row>
              <Row label="Transaction">
                {d.txSignature && d.explorerUrl ? (
                  <a href={d.explorerUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">{d.txSignature}</a>
                ) : d.buildStatus === 'SUCCESS' ? (
                  <span className="text-slate-400">
                    Not recorded yet
                    {d.processingStatus === 'FAILED' && (
                      <button onClick={retryChain} className="ml-3 rounded-md bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500">
                        Retry recording
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-500">N/A for failed builds</span>
                )}
              </Row>
              <Row label="Workflow">
                {d.workflowUrl ? <a href={d.workflowUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">run {d.workflowRunId} (attempt {d.runAttempt})</a> : `run ${d.workflowRunId}`}
              </Row>
              <Row label="Received">{fmtDate(d.createdAt)}</Row>
              {d.errorMessage && <Row label="Processing error"><span className="text-rose-300">{d.errorMessage}</span></Row>}
              {retryError && <Row label="Retry"><span className="text-rose-300">{retryError}</span></Row>}
            </dl>

            {d.buildStatus === 'FAILURE' && (
              <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-slate-100">AI analysis</h2>
                  <StatusBadge value={d.aiStatus} />
                </div>
                {d.aiAnalysis ? (
                  <div className="space-y-3 text-sm">
                    <div><div className="text-slate-400">Error</div><p>{d.aiAnalysis.error_identification}</p></div>
                    <div><div className="text-slate-400">Root cause</div><p>{d.aiAnalysis.root_cause}</p></div>
                    <div>
                      <div className="text-slate-400">Recommended solutions</div>
                      <ul className="list-disc space-y-1 pl-5">{d.aiAnalysis.recommended_solutions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div className="text-slate-400">Confidence: <span className="text-slate-200">{d.aiAnalysis.confidence}</span></div>
                    <p className="text-xs text-slate-500">AI output is advisory and may be wrong. Review before acting.</p>
                  </div>
                ) : d.aiStatus === 'FAILED' ? (
                  <div className="space-y-2 text-sm text-slate-300">
                    <p>The analysis could not be completed.</p>
                    <button onClick={retry} className="rounded-md bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-500">Retry analysis</button>
                    {retryError && <p className="text-rose-300">{retryError}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Analysis in progress…</p>
                )}
              </section>
            )}
          </>
        )}
      </AsyncView>
    </div>
  );
}
