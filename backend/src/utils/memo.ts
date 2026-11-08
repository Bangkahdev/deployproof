export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const MEMO_MAX_BYTES = 500;

export interface MemoPayload {
  app: 'DEPLOYPROOF';
  v: 1;
  repo: string;
  commit: string;
  hash: string;
  ts: string;
}

export interface MemoExpectation {
  repo: string;
  commit: string;
  hash: string;
}

export function buildMemoPayload(input: MemoExpectation, now: Date = new Date()): MemoPayload {
  return {
    app: 'DEPLOYPROOF',
    v: 1,
    repo: input.repo,
    commit: input.commit.toLowerCase(),
    hash: input.hash.toLowerCase(),
    ts: now.toISOString(),
  };
}

/** Serialize and enforce the 500-byte limit using Buffer.byteLength (REQ-SOL / 8.3). */
export function serializeMemo(payload: MemoPayload): string {
  const json = JSON.stringify(payload);
  const size = Buffer.byteLength(json, 'utf8');
  if (size > MEMO_MAX_BYTES) {
    throw new RangeError(`Memo payload is ${size} bytes, limit is ${MEMO_MAX_BYTES}`);
  }
  return json;
}

export function parseMemo(raw: string): MemoPayload | null {
  try {
    const o = JSON.parse(raw) as Partial<MemoPayload>;
    if (
      o &&
      o.app === 'DEPLOYPROOF' &&
      o.v === 1 &&
      typeof o.repo === 'string' &&
      typeof o.commit === 'string' &&
      typeof o.hash === 'string' &&
      typeof o.ts === 'string'
    ) {
      return o as MemoPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function memoMatches(memo: MemoPayload, expected: MemoExpectation): boolean {
  return (
    memo.repo === expected.repo &&
    memo.commit.toLowerCase() === expected.commit.toLowerCase() &&
    memo.hash.toLowerCase() === expected.hash.toLowerCase()
  );
}

export function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
