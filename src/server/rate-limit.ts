/**
 * Einfacher In-Memory-Limiter für fehlgeschlagene Login-Versuche pro Schlüssel (IP).
 * Gilt nur für eine Prozessinstanz – für diese App (ein Container) ausreichend.
 */

export interface RateLimiterOptions {
  maxAttempts: number;
  windowMs: number;
  now?: () => number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export class FailureRateLimiter {
  private readonly entries = new Map<string, Entry>();
  private readonly now: () => number;

  constructor(private readonly options: RateLimiterOptions) {
    this.now = options.now ?? Date.now;
  }

  /** true, wenn für den Schlüssel keine weiteren Versuche mehr erlaubt sind. */
  isBlocked(key: string): boolean {
    const entry = this.active(key);
    return entry !== undefined && entry.count >= this.options.maxAttempts;
  }

  recordFailure(key: string): void {
    const entry = this.active(key);
    if (entry) {
      entry.count += 1;
    } else {
      this.prune();
      this.entries.set(key, { count: 1, resetAt: this.now() + this.options.windowMs });
    }
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  /** Sekunden bis zum Ablauf der Sperre (für `Retry-After`). */
  retryAfterSeconds(key: string): number {
    const entry = this.active(key);
    return entry ? Math.max(1, Math.ceil((entry.resetAt - this.now()) / 1000)) : 0;
  }

  private active(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.resetAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private prune(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}
