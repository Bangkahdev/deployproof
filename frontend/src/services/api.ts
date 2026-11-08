import type { Deployment, Health, Paginated, Stats, VerifyResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const KEY_STORAGE = 'deployproof_api_key';

export const getApiKey = () => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
};
export const setApiKey = (key: string) => {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage unavailable */
  }
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers['x-api-key'] = getApiKey();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the backend. Is it running?');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      res.status === 401
        ? 'Invalid or missing API key. Set it in Settings.'
        : (body?.message as string | undefined) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

export const api = {
  stats: () => request<Stats>('/dashboard/stats'),
  deployments: (q: { page?: number; limit?: number; status?: string; repo?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && p.set(k, String(v)));
    return request<Paginated<Deployment>>(`/deployments?${p.toString()}`);
  },
  deployment: (id: string) => request<Deployment>(`/deployments/${id}`),
  retryAi: (id: string) => request<unknown>(`/deployments/${id}/retry-ai`, { method: 'POST' }),
  retryBlockchain: (id: string) => request<unknown>(`/deployments/${id}/retry-blockchain`, { method: 'POST' }),
  health: () => request<Health>('/health', {}, false),
  // The verifier is public and returns a structured body for every outcome (200/404/422/503)
  verify: async (hash: string): Promise<VerifyResponse> => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/verify/${encodeURIComponent(hash)}`);
    } catch {
      return { verified: false, status: 'VERIFICATION_UNAVAILABLE', message: 'Cannot reach the backend.' };
    }
    const body = await res.json().catch(() => null);
    if (body?.status) return body as VerifyResponse;
    return {
      verified: false,
      status: 'VERIFICATION_UNAVAILABLE',
      message: body?.message ?? `Verification failed (${res.status})`,
    };
  },
};
