import { afterEach, describe, expect, it, vi } from "vitest";
import { pwnedCount, scorePassword } from "./passwordStrength";

describe("scorePassword", () => {
  it("scores an empty password as 0 with no label", () => {
    expect(scorePassword("")).toEqual({ score: 0, label: "" });
  });

  it("scores a short, single-class password as very weak", () => {
    expect(scorePassword("abc").score).toBe(0);
  });

  it("gives credit for length past 8 and past 12", () => {
    // Not "abcd..." -- that's itself a listed weak prefix (tested separately
    // below) and would cap the score regardless of length.
    expect(scorePassword("wxyzefgh").score).toBeGreaterThanOrEqual(1);
    expect(scorePassword("wxyzefghijkl").score).toBeGreaterThan(scorePassword("wxyzefgh").score);
  });

  it("rewards mixing character classes, not just length", () => {
    const longSingleClass = scorePassword("aaaaaaaaaaaa");
    const mixedSameLength = scorePassword("aB3!aB3!aB3!");
    expect(mixedSameLength.score).toBeGreaterThan(longSingleClass.score);
  });

  it("caps an all-repeated-character password at weak regardless of length", () => {
    expect(scorePassword("aaaaaaaaaaaaaaaa").score).toBeLessThanOrEqual(1);
  });

  it("caps a known-throwaway prefix at weak even when long and mixed-case", () => {
    // Long enough and varied enough to otherwise score well, but it starts
    // with an obvious throwaway (`WEAK_PREFIX`) -- that must win.
    expect(scorePassword("Password123!ExtraLength").score).toBeLessThanOrEqual(1);
  });

  it("scores a long, varied, non-obvious password as strong", () => {
    expect(scorePassword("Tr0ub4dor&3xtra!").score).toBe(4);
  });

  it("never returns a score outside 0-4", () => {
    for (const pw of ["", "x", "aB3!aB3!aB3!aB3!aB3!aB3!"]) {
      const { score } = scorePassword(pw);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });
});

describe("pwnedCount", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Same SHA-1-via-SubtleCrypto path pwnedCount itself uses (not node:crypto)
  // -- both compute the identical digest, so this is real ground truth, not a
  // duplicated re-implementation of some other hashing approach.
  async function hibpHashParts(password: string): Promise<{ prefix: string; suffix: string }> {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    return { prefix: hex.slice(0, 5), suffix: hex.slice(5) };
  }

  it("returns -1 for an empty password without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await pwnedCount("")).toBe(-1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns -1 when SubtleCrypto isn't available (older/locked-down browser)", async () => {
    vi.stubGlobal("crypto", {});
    expect(await pwnedCount("something")).toBe(-1);
  });

  it("returns the breach count when the API lists this password's suffix", async () => {
    const { prefix, suffix } = await hibpHashParts("hunter2");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        expect(url).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
        return new Response(`AAAA1:1\n${suffix}:42\nBBBB2:3\n`, { status: 200 });
      }),
    );
    expect(await pwnedCount("hunter2")).toBe(42);
  });

  it("returns 0 when the API responds but this password's suffix isn't listed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("AAAA1:1\nBBBB2:3\n", { status: 200 })),
    );
    expect(await pwnedCount("not-in-the-list")).toBe(0);
  });

  it("returns -1 when the API responds with a non-OK status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    expect(await pwnedCount("whatever")).toBe(-1);
  });

  it("returns -1 when the request fails outright (offline)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network unreachable");
      }),
    );
    expect(await pwnedCount("whatever")).toBe(-1);
  });
});
