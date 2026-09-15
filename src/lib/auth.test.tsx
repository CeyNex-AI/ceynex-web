import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth";
import { useAuth } from "./useAuth";
import * as tokenStorage from "./tokenStorage";

// Found live 2026-09-15 running e2e/a11y.spec.ts against a busy local
// backend: an occasional slow/failed GET /api/auth/me forced a real, valid
// session back to signed-out, because the bootstrap check treated ANY
// failure (a 5xx, a network error) the same as a genuine 401. Only a 401
// means the server actually revoked the session -- everything else means
// the check itself failed, and the stored token should be left alone so the
// next real navigation gets to try again.
function Probe() {
  const { userId, role, loading, sessionExpired } = useAuth();
  return (
    <div>
      <span data-testid="userId">{userId ?? "null"}</span>
      <span data-testid="role">{role ?? "null"}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="sessionExpired">{String(sessionExpired)}</span>
    </div>
  );
}

async function renderProbe() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await act(() => Promise.resolve());
}

describe("AuthProvider's bootstrap session check", () => {
  beforeEach(() => {
    vi.spyOn(tokenStorage, "getToken").mockReturnValue("stored-token");
    vi.spyOn(tokenStorage, "clearToken");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("clears the token and flags sessionExpired on a real 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    await renderProbe();

    expect(tokenStorage.clearToken).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sessionExpired")).toHaveTextContent("true");
    expect(screen.getByTestId("userId")).toHaveTextContent("null");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("does not clear the token on a 500 - the check failed, the session was not revoked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    await renderProbe();

    expect(tokenStorage.clearToken).not.toHaveBeenCalled();
    expect(screen.getByTestId("sessionExpired")).toHaveTextContent("false");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("does not clear the token when the request itself rejects (a network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await renderProbe();

    expect(tokenStorage.clearToken).not.toHaveBeenCalled();
    expect(screen.getByTestId("sessionExpired")).toHaveTextContent("false");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("sets userId and role on a real 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ email: "a@b.com", role: "researcher" }), { status: 200 })),
    );
    await renderProbe();

    expect(screen.getByTestId("userId")).toHaveTextContent("a@b.com");
    expect(screen.getByTestId("role")).toHaveTextContent("researcher");
    expect(tokenStorage.clearToken).not.toHaveBeenCalled();
  });
});
