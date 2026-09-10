export type Role = "policymaker" | "admin" | "researcher" | "exporter";

/**
 * The four roles, mirroring ceynex-core's `ceynex/api/users.py` `VALID_ROLES`.
 * Since RBAC landed there are no fixed demo accounts and no self-selected role
 * at signup -- a new account always lands on `researcher` (the backend's
 * `DEFAULT_ROLE`); only an admin moves it elsewhere, from the Admin page. The
 * signed-in role always comes from the server's response, never from here (see
 * auth.tsx).
 */
export const ALL_ROLES: Role[] = ["researcher", "exporter", "policymaker", "admin"];

export const ROLE_LABELS: Record<Role, string> = {
  policymaker: "Policymaker",
  admin: "Admin",
  researcher: "Researcher",
  exporter: "Exporter",
};
