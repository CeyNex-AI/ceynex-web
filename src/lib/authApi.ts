/**
 * Real POST /api/auth/login and GET /api/auth/me, proxied same-origin by nginx
 * (ceynex-infra/frontend/nginx.conf.template) -> the backend, same pattern as
 * queryApi.ts. Replaces auth.tsx's old localStorage-only "login" with an
 * actual server-side credential check against ceynex-core's fixed demo
 * accounts (ceynex/api/auth.py).
 */

export interface LoginResult {
  token: string;
  email: string;
  role: string;
}

export interface MeResult {
  email: string;
  role: string;
}

export async function loginApi(email: string, password: string): Promise<LoginResult> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Incorrect email or password.");
    throw new Error(`Login failed (${res.status}).`);
  }

  return res.json();
}

export async function fetchMe(token: string): Promise<MeResult> {
  const res = await fetch("/api/auth/me", {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Session check failed (${res.status}).`);
  }

  return res.json();
}
