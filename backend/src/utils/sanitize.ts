const ANSI = /\x1B\[[0-9;?]*[ -/]*[@-~]/g;

const RULES: Array<[RegExp, string]> = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[REDACTED_PRIVATE_KEY]'],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[REDACTED_TOKEN]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]'],
  [/\bAIza[0-9A-Za-z_-]{30,}\b/g, '[REDACTED_API_KEY]'],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_API_KEY]'],
  [/\bnpm_[A-Za-z0-9]{30,}\b/g, '[REDACTED_TOKEN]'],
  [/(bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[REDACTED]'],
  [/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, '$1[REDACTED]@'],
  [
    /\b([A-Za-z0-9_.-]*(?:password|passwd|secret|token|api[_-]?key|private[_-]?key|access[_-]?key|authorization)[A-Za-z0-9_.-]*)(\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi,
    '$1$2[REDACTED]',
  ],
  // Solana secret keys in base58 (~87-88 chars) and long base64 blobs
  [/\b[1-9A-HJ-NP-Za-km-z]{80,100}\b/g, '[REDACTED_KEY]'],
  [/[A-Za-z0-9+/]{86,}={0,2}/g, '[REDACTED_BLOB]'],
];

export interface SanitizeOptions {
  maxLines?: number;
  maxBytes?: number;
}

/**
 * Strip ANSI codes, redact credentials, then keep only the LAST `maxLines`
 * lines and at most `maxBytes` bytes (REQ-AI-02/03, NFR-SEC-07).
 */
export function sanitizeLogs(input: string, opts: SanitizeOptions = {}): string {
  const maxLines = opts.maxLines ?? 200;
  const maxBytes = opts.maxBytes ?? 20 * 1024;

  let text = input.replace(ANSI, '').replace(/\r/g, '');
  for (const [re, replacement] of RULES) text = text.replace(re, replacement);

  text = text.split('\n').slice(-maxLines).join('\n');

  const buf = Buffer.from(text, 'utf8');
  if (buf.length > maxBytes) {
    text = buf.subarray(buf.length - maxBytes).toString('utf8').replace(/^\uFFFD+/, '');
  }
  return text.trim();
}
