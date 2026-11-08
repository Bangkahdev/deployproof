import { describe, expect, it } from 'vitest';
import { sanitizeLogs } from '../src/utils/sanitize';

describe('sanitizeLogs', () => {
  it('redacts tokens, passwords and private keys', () => {
    const out = sanitizeLogs(
      [
        'token=ghp_abcdefghijklmnopqrstuvwxyz0123456789',
        'DB_PASSWORD: hunter2',
        'Authorization: Bearer abcdefghijklmnop1234',
        'https://user:pass@example.com/x',
        '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----',
      ].join('\n'),
    );
    expect(out).not.toMatch(/ghp_abc|hunter2|abcdefghijklmnop1234|user:pass|MIIEvQ/);
    expect(out).toContain('[REDACTED');
  });

  it('keeps only the last 200 lines', () => {
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i}`).join('\n');
    const out = sanitizeLogs(lines).split('\n');
    expect(out).toHaveLength(200);
    expect(out.at(-1)).toBe('line 499');
    expect(out[0]).toBe('line 300');
  });

  it('caps output at 20 KB', () => {
    const big = Array.from({ length: 200 }, () => 'x'.repeat(400)).join('\n');
    expect(Buffer.byteLength(sanitizeLogs(big))).toBeLessThanOrEqual(20 * 1024);
  });

  it('strips ANSI escape codes', () => {
    expect(sanitizeLogs('\x1b[31mERROR\x1b[0m failed')).toBe('ERROR failed');
  });
});
