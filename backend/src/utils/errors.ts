/** Error that is safe to show to API clients. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

/** Retrying will not help (e.g. insufficient SOL, invalid memo). */
export class PermanentError extends Error {}

/** Work is in flight; check again later without consuming an attempt. */
export class WaitError extends Error {}
