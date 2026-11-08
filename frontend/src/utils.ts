export const shorten = (s: string | null | undefined, n = 8) => (s ? (s.length > n * 2 + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s) : '—');
export const fmtDate = (iso: string) => new Date(iso).toLocaleString();
