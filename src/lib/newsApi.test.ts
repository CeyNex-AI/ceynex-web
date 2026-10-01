import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setSessionExpiredHandler } from "./apiFetch";
import { fetchNewsSearch, fetchTrending } from "./newsApi";
import * as tokenStorage from "./tokenStorage";

// Both news endpoints require sign-in on the backend. Before this, the client
// sent no token at all, so requiring it there would have emptied every news
// panel without a visible error.
describe("newsApi", () => {
  const onSessionExpired = vi.fn();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSessionExpired.mockClear();
    setSessionExpiredHandler(onSessionExpired);
  });

  afterEach(() => {
    setSessionExpiredHandler(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stubFetch(status: number, body: unknown = {}) {
    fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", fetchMock);
  }

  function sentHeaders(): Record<string, string> {
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    return init.headers as Record<string, string>;
  }

  it("sends the session token with a news search", async () => {
    vi.spyOn(tokenStorage, "getToken").mockReturnValue("tok");
    stubFetch(200, { query: "tea", articles: [], source: "cache" });

    await fetchNewsSearch("tea", { limit: 5 });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/news/search?q=tea&limit=5");
    expect(sentHeaders()).toEqual({ authorization: "Bearer tok" });
  });

  it("sends the session token for trending topics", async () => {
    vi.spyOn(tokenStorage, "getToken").mockReturnValue("tok");
    stubFetch(200, { status: "ready", computed_at: null, partial: false, scopes: {} });

    await fetchTrending();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/news/trending");
    expect(sentHeaders()).toEqual({ authorization: "Bearer tok" });
  });

  it("does not throw before the request when signed out; the server's 401 decides", async () => {
    vi.spyOn(tokenStorage, "getToken").mockReturnValue(null);
    stubFetch(401);

    await expect(fetchTrending()).rejects.toThrow("(401)");
    expect(sentHeaders()).toEqual({});
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("takes the signed-out path when the server rejects the token", async () => {
    vi.spyOn(tokenStorage, "getToken").mockReturnValue("revoked");
    stubFetch(401);

    await expect(fetchNewsSearch("tea")).rejects.toThrow("(401)");
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
