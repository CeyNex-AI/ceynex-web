import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, setSessionExpiredHandler } from "./apiFetch";
import * as tokenStorage from "./tokenStorage";

// The whole point of apiFetch (its own module docstring): a 401 on a request
// that carried a bearer token means the session was cut from elsewhere, not a
// wrong password -- that's what should trigger the "you were signed out"
// handler, and only that.
describe("apiFetch", () => {
  const onSessionExpired = vi.fn();

  beforeEach(() => {
    onSessionExpired.mockClear();
    setSessionExpiredHandler(onSessionExpired);
    vi.spyOn(tokenStorage, "getToken").mockReturnValue("still-here");
  });

  afterEach(() => {
    setSessionExpiredHandler(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stubFetch(status: number) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status })),
    );
  }

  it("fires the handler on a 401 to a request that carried a bearer token", async () => {
    stubFetch(401);
    await apiFetch("/api/history", { headers: { Authorization: "Bearer x" } });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("recognises a Headers instance carrying the bearer token, not just a plain object", async () => {
    stubFetch(401);
    const headers = new Headers();
    headers.set("Authorization", "Bearer x");
    await apiFetch("/api/history", { headers });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("does not fire on a 401 with no Authorization header (an anonymous call)", async () => {
    stubFetch(401);
    await apiFetch("/api/query", { method: "POST" });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not fire on a 401 to login/signup-shaped calls with no bearer token", async () => {
    stubFetch(401);
    await apiFetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" } });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not fire when the token has already been cleared (already signed out)", async () => {
    vi.spyOn(tokenStorage, "getToken").mockReturnValue(null);
    stubFetch(401);
    await apiFetch("/api/history", { headers: { Authorization: "Bearer x" } });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not fire on a non-401 response even with a bearer token", async () => {
    stubFetch(500);
    await apiFetch("/api/history", { headers: { Authorization: "Bearer x" } });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("still returns the response either way", async () => {
    stubFetch(401);
    const res = await apiFetch("/api/history", { headers: { Authorization: "Bearer x" } });
    expect(res.status).toBe(401);
  });
});
