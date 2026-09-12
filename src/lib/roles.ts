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

/** Roles a new signup may pick — everything except `admin`, which is only ever
 * created by an existing admin (mirrors ceynex-core's `users.SIGNUP_ROLES`). */
export const SIGNUP_ROLES: Role[] = ["researcher", "exporter", "policymaker"];

export const ROLE_LABELS: Record<Role, string> = {
  policymaker: "Policymaker",
  admin: "Admin",
  researcher: "Researcher",
  exporter: "Exporter",
};
