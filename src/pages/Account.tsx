import { useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "../lib/roles";
import { useAuth } from "../lib/useAuth";

const PLANNED = ["Notification preferences", "API keys for programmatic access"];

export default function Account() {
  const { userId, role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Account</h1>
        <p className="text-sm text-gray-500 mb-6">Your CeyNex session.</p>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Signed in as</div>
            <div className="text-sm text-gray-800">{userId ?? "Not signed in"}</div>
          </div>

          {role && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Role</div>
              <span className="inline-block text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
                {ROLE_LABELS[role]}
              </span>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Demo login — no account verification, profile, or preferences yet.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium border border-gray-300 rounded-md px-4 py-2.5 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Planned, not built yet
          </p>
          <ul className="space-y-1.5">
            {PLANNED.map((item) => (
              <li key={item} className="text-sm text-gray-500 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
