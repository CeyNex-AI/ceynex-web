export type Role = "policymaker" | "admin" | "researcher" | "exporter";

/**
 * Fixed demo accounts, not a self-selected dropdown -- picking your own role
 * would make the Admin gate meaningless. There's still no real backend/
 * credential check (see auth.tsx), so this is "closer to RBAC" rather than
 * actual RBAC: anyone can type these emails in. It's enough to demo the
 * access boundary without fabricating a user database.
 */
export const DEMO_ACCOUNTS: Record<string, Role> = {
  "policymaker@ceynex.dev": "policymaker",
  "admin@ceynex.dev": "admin",
  "researcher@ceynex.dev": "researcher",
  "exporter@ceynex.dev": "exporter",
};

export const ROLE_LABELS: Record<Role, string> = {
  policymaker: "Policymaker",
  admin: "Admin",
  researcher: "Researcher",
  exporter: "Exporter",
};

/** Any email not in DEMO_ACCOUNTS gets the lowest-privilege role, never Admin. */
export function roleForEmail(email: string): Role {
  return DEMO_ACCOUNTS[email.trim().toLowerCase()] ?? "researcher";
}
