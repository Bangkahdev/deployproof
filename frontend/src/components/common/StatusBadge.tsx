const styles: Record<string, string> = {
  SUCCESS: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  VERIFIED: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  FAILURE: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  FAILED: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  VERIFICATION_FAILED: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  PENDING: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  PROCESSING: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  NOT_FOUND: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
  VERIFICATION_UNAVAILABLE: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  NOT_REQUIRED: 'bg-slate-500/10 text-slate-400 ring-slate-500/30',
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-500">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[value] ?? styles.NOT_REQUIRED}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}
