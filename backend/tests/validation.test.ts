import { describe, expect, it } from 'vitest';
import { isSha256, webhookSchema } from '../src/utils/validation';

const ok = {
  repo: 'username/deployproof',
  commit: 'a1b2c3d4e5f6789012345678901234567890abcd',
  buildHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  status: 'success',
  workflowRunId: '123456789',
  runAttempt: 1,
  workflowUrl: 'https://github.com/username/deployproof/actions/runs/123456789',
};

describe('webhook validation', () => {
  it('accepts a valid success payload', () => {
    expect(webhookSchema.safeParse(ok).success).toBe(true);
  });
  it('accepts a failure payload without buildHash', () => {
    const { buildHash: _b, ...rest } = ok;
    expect(webhookSchema.safeParse({ ...rest, status: 'failure', logs: 'boom' }).success).toBe(true);
  });
  it('requires buildHash for success', () => {
    const { buildHash: _b, ...rest } = ok;
    expect(webhookSchema.safeParse(rest).success).toBe(false);
  });
  it('rejects bad repo, commit, hash and status', () => {
    expect(webhookSchema.safeParse({ ...ok, repo: 'nope' }).success).toBe(false);
    expect(webhookSchema.safeParse({ ...ok, commit: 'abc' }).success).toBe(false);
    expect(webhookSchema.safeParse({ ...ok, buildHash: 'xyz' }).success).toBe(false);
    expect(webhookSchema.safeParse({ ...ok, status: 'maybe' }).success).toBe(false);
  });
  it('validates SHA-256 format', () => {
    expect(isSha256(ok.buildHash)).toBe(true);
    expect(isSha256('abc')).toBe(false);
  });
});
