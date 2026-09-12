/**
 * Makes sure the two accounts the specs sign in with exist, the way a real
 * deployment gets them, and signs each in once. Runs before any spec, straight
 * against the API.
 *
 * ceynex-core's RBAC replaced the four fixed demo accounts with a `users`
 * table, so nothing exists until someone creates it:
 *
 * - the **policymaker** is created here, through `POST /api/auth/signup`, the
 *   same route a reader uses. A 409 means an earlier run already made it.
 * - the **admin** cannot be, and must not be: a signup never grants `admin`.
 *   The API seeds it at startup from `CEYNEX_BOOTSTRAP_ADMIN` (`email:password`,
 *   see e2e/README.md). This only checks it can sign in, so a missing seed fails
 *   here, with the fix in the message, rather than as a timeout on the Admin page.
 *
 * The two tokens go to the specs through the environment, which Playwright
 * hands to every worker. `helpers.ts::login` starts each spec signed in with
 * one, rather than through the form. Through the form, a run signed in about 50
 * times from one address. That is over ceynex-core's login limit of 10 a
 * minute, and the 11th sign-in failed with a 429.
 */

import { ADMIN, DEMO } from "./helpers";

const API = process.env.VITE_API_TARGET ?? "http://127.0.0.1:8079";

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A token for the account, or null when it cannot sign in. */
async function signIn(who: { email: string; password: string }): Promise<string | null> {
  const res = await post("/api/auth/login", who);
  if (!res.ok) return null;
  return ((await res.json()) as { token: string }).token;
}

export default async function globalSetup(): Promise<void> {
  let demoToken = await signIn(DEMO);
  if (!demoToken) {
    const res = await post("/api/auth/signup", { ...DEMO, role: "policymaker" });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Could not create ${DEMO.email} (${res.status}): ${await res.text()}`);
    }
    demoToken = await signIn(DEMO);
    if (!demoToken) {
      throw new Error(
        `${DEMO.email} exists but its password is not "${DEMO.password}". ` +
          "Reset it from the Admin page, or delete the row, and run again.",
      );
    }
  }

  const adminToken = await signIn(ADMIN);
  if (!adminToken) {
    throw new Error(
      `${ADMIN.email} cannot sign in. Start the API with ` +
        `CEYNEX_BOOTSTRAP_ADMIN=${ADMIN.email}:${ADMIN.password} (see e2e/README.md); ` +
        "a signup can never create an admin.",
    );
  }

  process.env.E2E_TOKEN_DEMO = demoToken;
  process.env.E2E_TOKEN_ADMIN = adminToken;
}
