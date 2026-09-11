import { useState, type FormEvent } from "react";
import { Navigate, useLocation, type Location } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import usePageTitle from "../lib/usePageTitle";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_LABELS } from "../lib/roles";

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
  const { userId, loading, login } = useAuth();
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
                  <p className="text-sm font-medium text-gray-900">{feature.title}</p>
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

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
          >
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
              className="w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md px-4 py-2.5 transition-colors"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-500">
            Demo accounts, password <span className="font-mono">{DEMO_PASSWORD}</span> for all.
          </p>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 text-center">
              Try a demo role
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {Object.entries(DEMO_ACCOUNTS).map(([demoEmail, role]) => (
                <button
                  key={demoEmail}
                  type="button"
                  onClick={() => {
                    setEmail(demoEmail);
                    setPassword(DEMO_PASSWORD);
                    setError(null);
                  }}
                  className="text-xs text-gray-500 hover:text-teal-700 bg-white border border-gray-200 rounded-full px-3 py-1"
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
