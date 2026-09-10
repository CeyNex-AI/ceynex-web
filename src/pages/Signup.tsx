import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, type Location } from "react-router-dom";
import PasswordStrength from "../components/PasswordStrength";
import { useAuth } from "../lib/useAuth";
import usePageTitle from "../lib/usePageTitle";

/**
 * Self-service registration -- POST /api/auth/signup (see authApi.ts). The
 * backend creates the account at its default role and logs it straight in, so
 * on success `userId` goes truthy and the guard below redirects, exactly like
 * Login.tsx. New accounts always start as "Researcher"; an admin changes that
 * from the Admin page.
 */
export default function Signup() {
  usePageTitle("Sign up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { userId, loading, signup } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/query";

  if (loading) {
    return null;
  }
  if (userId) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter both an email and a password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await signup(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="mb-2">
            <img
              src="/ceynex-logo.png"
              alt="CeyNex — Multi-Agent Decision Intelligence Platform for Sri Lanka's National Export Economy"
              className="w-44 h-auto mx-auto"
            />
          </h1>
          <p className="text-sm text-gray-500">Create an account</p>
        </div>

        <form onSubmit={handleSubmit} className="cx-panel p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="cx-input w-full px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="cx-input w-full px-3 py-2 text-sm"
              placeholder="At least 8 characters"
            />
            <PasswordStrength password={password} />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="cx-input w-full px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="cx-btn-primary w-full disabled:cursor-not-allowed text-sm px-4 py-2.5"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            New accounts start with the Researcher role.
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/" className="text-teal-700 hover:text-teal-800 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
