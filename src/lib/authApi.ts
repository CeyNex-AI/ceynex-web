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

/**
 * POST /api/auth/signup -- creates an account at the backend's default role
 * and returns the same shape as login, so the caller can drop straight into a
 * signed-in session. 409 means the email is already taken; 422 is a password
 * the backend rejected as too short (the form checks length first, so this is
 * the belt-and-braces case).
 */
export async function signupApi(email: string, password: string): Promise<LoginResult> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    if (res.status === 409) throw new Error("An account with that email already exists.");
    if (res.status === 422) throw new Error("Password must be at least 8 characters.");
    throw new Error(`Sign up failed (${res.status}).`);
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
