/**
 * Makes sure the two accounts the specs sign in with exist, the way a real
 * deployment gets them. Runs once, before any spec, straight against the API.
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

async function canSignIn(who: { email: string; password: string }): Promise<boolean> {
  const res = await post("/api/auth/login", who);
  return res.ok;
}

export default async function globalSetup(): Promise<void> {
  if (!(await canSignIn(DEMO))) {
    const res = await post("/api/auth/signup", { ...DEMO, role: "policymaker" });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Could not create ${DEMO.email} (${res.status}): ${await res.text()}`);
    }
    if (!(await canSignIn(DEMO))) {
      throw new Error(
        `${DEMO.email} exists but its password is not "${DEMO.password}". ` +
          "Reset it from the Admin page, or delete the row, and run again.",
      );
    }
  }

  if (!(await canSignIn(ADMIN))) {
    throw new Error(
      `${ADMIN.email} cannot sign in. Start the API with ` +
        `CEYNEX_BOOTSTRAP_ADMIN=${ADMIN.email}:${ADMIN.password} (see e2e/README.md); ` +
        "a signup can never create an admin.",
    );
  }
}
