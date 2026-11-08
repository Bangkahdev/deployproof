import { describe, expect, it } from 'vitest';
import {
  MEMO_MAX_BYTES,
  buildMemoPayload,
  explorerUrl,
  memoMatches,
  parseMemo,
  serializeMemo,
} from '../src/utils/memo';

const input = {
  repo: 'username/deployproof',
  commit: 'a1b2c3d4e5f6789012345678901234567890abcd',
  hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};

describe('memo', () => {
  it('serializes within the byte limit and round-trips', () => {
    const json = serializeMemo(buildMemoPayload(input, new Date('2026-11-08T13:00:00.000Z')));
    expect(Buffer.byteLength(json)).toBeLessThanOrEqual(MEMO_MAX_BYTES);
    const parsed = parseMemo(json);
    expect(parsed?.ts).toBe('2026-11-08T13:00:00.000Z');
    expect(parsed && memoMatches(parsed, input)).toBe(true);
  });

  it('rejects payloads over 500 bytes before sending', () => {
    const p = buildMemoPayload({ ...input, repo: 'a'.repeat(600) });
    expect(() => serializeMemo(p)).toThrow(RangeError);
  });

  it('detects mismatches and invalid memos', () => {
    const p = buildMemoPayload(input);
    expect(memoMatches(p, { ...input, hash: '0'.repeat(64) })).toBe(false);
    expect(parseMemo('not json')).toBeNull();
    expect(parseMemo('{"app":"OTHER"}')).toBeNull();
  });

  it('builds a devnet explorer url', () => {
    expect(explorerUrl('SIG')).toBe('https://explorer.solana.com/tx/SIG?cluster=devnet');
  });
});
