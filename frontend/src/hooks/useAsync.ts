import { useCallback, useEffect, useState } from 'react';

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Fetch helper with optional polling while `shouldPoll(data)` is true. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], shouldPoll?: (d: T) => boolean) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const run = async (initial: boolean) => {
      if (initial) setState((s) => ({ ...s, loading: true }));
      try {
        const data = await fn();
        if (cancelled) return;
        setState({ data, error: null, loading: false });
        if (shouldPoll?.(data)) timer = window.setTimeout(() => void run(false), 3000);
      } catch (e) {
        if (!cancelled) setState((s) => ({ data: s.data, error: e instanceof Error ? e.message : 'Unknown error', loading: false }));
      }
    };
    void run(true);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
