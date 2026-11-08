import { Link } from 'react-router-dom';
import type { Deployment } from '../../types';
import { fmtDate, shorten } from '../../utils';
import { StatusBadge } from '../common/StatusBadge';

export function DeploymentTable({ items }: { items: Deployment[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-2">Repository</th>
            <th className="px-3 py-2">Commit</th>
            <th className="px-3 py-2">Build hash</th>
            <th className="px-3 py-2">Build</th>
            <th className="px-3 py-2">Processing</th>
            <th className="px-3 py-2">Tx</th>
            <th className="px-3 py-2">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {items.map((d) => (
            <tr key={d.id} className="hover:bg-slate-900/50">
              <td className="px-3 py-2">
                <Link to={`/deployments/${d.id}`} className="text-sky-300 hover:underline">
                  {d.repoName}
                </Link>
              </td>
              <td className="mono px-3 py-2">{d.commitHash.slice(0, 7)}</td>
              <td className="mono px-3 py-2" title={d.buildHash ?? ''}>{shorten(d.buildHash, 6)}</td>
              <td className="px-3 py-2"><StatusBadge value={d.buildStatus} /></td>
              <td className="px-3 py-2"><StatusBadge value={d.processingStatus} /></td>
              <td className="mono px-3 py-2">
                {d.explorerUrl ? (
                  <a href={d.explorerUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
                    {shorten(d.txSignature, 5)}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-400">{fmtDate(d.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
