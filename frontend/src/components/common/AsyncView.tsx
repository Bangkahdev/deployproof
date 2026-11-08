import type { ReactNode } from 'react';

interface Props {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  hasData: boolean;
  children: ReactNode;
}

export function AsyncView({ loading, error, empty, emptyText = 'Nothing here yet.', hasData, children }: Props) {
  if (loading && !hasData) {
    return (
      <div className="flex items-center gap-3 p-8 text-slate-400" role="status">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
        Loading…
      </div>
    );
  }
  if (error && !hasData) {
    return <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">{error}</div>;
  }
  if (empty) return <div className="rounded-lg border border-slate-800 p-8 text-center text-slate-400">{emptyText}</div>;
  return <>{children}</>;
}
