import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, type Location } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import usePageTitle from "../lib/usePageTitle";

const FEATURES = [
  {
    title: "Ask in plain language",
    detail: "Questions about tea, cinnamon, and apparel export performance. No query syntax to learn.",
  },
  {
    title: "See the evidence, not just the answer",
    detail: "Every figure is grounded in a named source, shown beside the answer and expandable to the underlying query.",
  },
  {
    title: "Forecasts with an honest interval",
    detail: "Short-term outlooks come with a shaded uncertainty band and a self-reported backtest, never a bare number.",
  },
];

export default function Login() {
  usePageTitle("Sign in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { userId, loading, login, sessionExpired } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/query";

  // Handles two cases with one code path: already signed in on load (e.g.
  // typed "/" directly), or just signed in via handleSubmit below -- either
  // way userId goes truthy and this fires on the next render. Using an
  // imperative navigate() call in handleSubmit *and* this guard raced each
  // other (both try to redirect right after login()), so there's only one now.
  // `loading` covers the gap while a stored token is still being checked
  // against the server -- redirecting before that resolves would either bounce
  // a valid session back to the form or flash the form before an invalid one
  // is cleared.
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
    setSubmitting(true);
    try {
      // The guard above redirects to `from` once this resolves and userId
      // flips truthy.
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-12 items-center">
        <div className="hidden lg:block">
          <h1 className="mb-4">
            <img
              src="/ceynex-logo.png"
              alt="CeyNex — Multi-Agent Decision Intelligence Platform for Sri Lanka's National Export Economy"
              className="w-56 h-auto"
            />
          </h1>
          <p className="text-sm text-gray-500 mb-8 max-w-sm">
            Multi-agent trade intelligence for Sri Lanka's export economy
          </p>
          <ul className="space-y-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                <div>
                  <p className="font-display text-sm font-bold text-gray-900">{feature.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 max-w-sm">{feature.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="text-center lg:hidden mb-8">
            <h1 className="mb-2">
              <img
                src="/ceynex-logo.png"
                alt="CeyNex — Multi-Agent Decision Intelligence Platform for Sri Lanka's National Export Economy"
                className="w-44 h-auto mx-auto"
              />
            </h1>
            <p className="text-sm text-gray-500">
              Multi-agent trade intelligence for Sri Lanka's export economy
            </p>
          </div>

          {sessionExpired && !error && (
            <p role="status" className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
              You were signed out — your session ended or your account access changed. Sign in again to continue.
            </p>
          )}

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
                autoComplete="current-password"
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
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-teal-700 hover:text-teal-800 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
