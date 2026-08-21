export type Role = "policymaker" | "admin" | "researcher" | "exporter";

/**
 * Fixed demo accounts, not a self-selected dropdown -- picking your own role
 * would make the Admin gate meaningless. Mirrors ceynex-core's
 * `ceynex/api/auth.py` exactly; the role shown here is only a label for the
 * login page's shortcut buttons, never the source of truth -- the signed-in
 * role always comes from the server's response (see auth.tsx).
 */
export const DEMO_ACCOUNTS: Record<string, Role> = {
  "policymaker@ceynex.dev": "policymaker",
  "admin@ceynex.dev": "admin",
  "researcher@ceynex.dev": "researcher",
  "exporter@ceynex.dev": "exporter",
};

/** Shared by all four demo accounts server-side -- see ceynex/api/auth.py. */
export const DEMO_PASSWORD = "ceynex-demo";

export const ROLE_LABELS: Record<Role, string> = {
  policymaker: "Policymaker",
  admin: "Admin",
  researcher: "Researcher",
  exporter: "Exporter",
};
