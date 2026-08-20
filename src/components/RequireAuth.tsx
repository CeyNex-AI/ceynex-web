import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

/**
 * Query/Help/Account/Admin are all gated on being signed in -- the nav bar
 * only hides the "Login" link when authenticated, it never stopped someone
 * reaching these routes directly by URL. `state.from` lets Login send you
 * back to wherever you were headed instead of always landing on Query.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const location = useLocation();

  if (!userId) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
