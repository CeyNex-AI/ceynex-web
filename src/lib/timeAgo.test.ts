import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import timeAgo from "./timeAgo";

const NOW = new Date("2026-01-01T12:00:00Z");

function isoSecondsAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads under a minute as just now", () => {
    expect(timeAgo(isoSecondsAgo(30))).toBe("just now");
  });

  it("reads minutes ago below an hour", () => {
    expect(timeAgo(isoSecondsAgo(5 * 60))).toBe("5m ago");
  });

  it("reads hours ago below a day", () => {
    expect(timeAgo(isoSecondsAgo(3 * 3600))).toBe("3h ago");
  });

  it("reads days ago past a day", () => {
    expect(timeAgo(isoSecondsAgo(2 * 86400))).toBe("2d ago");
  });

  it("never goes negative for a timestamp in the future (clock skew)", () => {
    expect(timeAgo(isoSecondsAgo(-30))).toBe("just now");
  });
});
