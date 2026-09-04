import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createApiKey,
  fetchApiKeys,
  fetchPreferences,
  revokeApiKey,
  savePreferences,
  type ApiKeyItem,
  type NewApiKey,
  type NotificationPreferences,
} from "../lib/accountApi";
import { ROLE_LABELS } from "../lib/roles";
import { useAuth } from "../lib/useAuth";
import usePageTitle from "../lib/usePageTitle";

const PREFERENCE_LABELS: Record<keyof NotificationPreferences, string> = {
  dq_flag_alerts: "Data-quality flags on data I use",
  forecast_updates: "Forecast and model updates",
  weekly_digest: "Weekly summary digest",
};

export default function Account() {
  usePageTitle("Account");
  const { userId, role, logout } = useAuth();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const [keys, setKeys] = useState<ApiKeyItem[] | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<NewApiKey | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPreferences()
      .then(setPrefs)
      .catch((e: Error) => setPrefsError(e.message))
      .finally(() => setPrefsLoading(false));
    reloadKeys();
  }, []);

  function reloadKeys() {
    fetchApiKeys()
      .then(setKeys)
      .catch((e: Error) => setKeysError(e.message));
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  async function handleSavePreferences(e: FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setPrefsSaving(true);
    setPrefsError(null);
    setPrefsSaved(false);
    try {
      const saved = await savePreferences(prefs);
      setPrefs(saved);
      setPrefsSaved(true);
    } catch (e) {
      setPrefsError((e as Error).message);
    } finally {
      setPrefsSaving(false);
    }
  }

  async function handleCreateKey(e: FormEvent) {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const key = await createApiKey(newKeyLabel.trim());
      setJustCreated(key);
      setNewKeyLabel("");
      reloadKeys();
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number) {
    setRevokingId(id);
    setKeysError(null);
    try {
      await revokeApiKey(id);
      reloadKeys();
    } catch (e) {
      setKeysError((e as Error).message);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Account</h1>
          <p className="text-sm text-gray-500">Your CeyNex session, preferences, and API keys.</p>
        </div>

        <div className="cx-panel-flat p-6 space-y-4">
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
            Demo login: four fixed accounts, no self-service signup.
          </p>
          <button type="button" onClick={handleLogout} className="cx-btn-secondary w-full text-sm px-4 py-2.5">
            Sign out
          </button>
        </div>

        <div className="cx-panel-flat p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">Notification preferences</h2>
          <p className="text-xs text-gray-400">
            What you'd be notified about, once a delivery channel exists for it. These are saved
            now; nothing is sent yet.
          </p>
          {prefsLoading && <p className="text-sm text-gray-500">Loading...</p>}
          {prefs && (
            <form onSubmit={handleSavePreferences} className="space-y-3">
              {(Object.keys(PREFERENCE_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
                <label key={key} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) =>
                      setPrefs((current) => (current ? { ...current, [key]: e.target.checked } : current))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  {PREFERENCE_LABELS[key]}
                </label>
              ))}
              {prefsError && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                  {prefsError}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={prefsSaving} className="cx-btn-primary text-sm px-4 py-2">
                  {prefsSaving ? "Saving..." : "Save"}
                </button>
                {prefsSaved && !prefsSaving && <span className="text-xs text-teal-700">Saved.</span>}
              </div>
            </form>
          )}
        </div>

        <div className="cx-panel-flat p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">API keys</h2>
          <p className="text-xs text-gray-400">
            For programmatic access to the query API. A key authenticates the same way your login
            session does, at your account's current role.
          </p>

          {justCreated && (
            <div className="bg-teal-50 border border-teal-200 rounded-md px-4 py-3 space-y-2">
              <p className="text-xs text-teal-800">
                Copy this key now -- it won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-teal-200 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">
                  {justCreated.key}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(justCreated.key)}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800 border border-teal-300 rounded px-2 py-1.5 shrink-0"
                >
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={() => setJustCreated(null)}
                className="text-xs text-teal-700 hover:text-teal-800"
              >
                Done
              </button>
            </div>
          )}

          {keysError && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              {keysError}
            </p>
          )}

          {keys && keys.length > 0 && (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 text-sm border border-gray-200 rounded-md px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-gray-800 truncate">{k.label}</div>
                    <div className="text-xs text-gray-400">
                      <code>{k.key_prefix}...</code>
                      {k.revoked ? " · revoked" : k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : " · never used"}
                    </div>
                  </div>
                  {!k.revoked && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      className="text-xs font-medium text-red-700 hover:text-red-800 disabled:text-gray-400 shrink-0"
                    >
                      {revokingId === k.id ? "Revoking..." : "Revoke"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {keys && keys.length === 0 && (
            <p className="text-sm text-gray-500">No API keys yet.</p>
          )}

          <form onSubmit={handleCreateKey} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Label, e.g. CI pipeline"
              maxLength={100}
              className="cx-input flex-1 min-w-0 text-sm px-3 py-2"
            />
            <button
              type="submit"
              disabled={creating || !newKeyLabel.trim()}
              className="cx-btn-primary text-sm px-4 py-2 shrink-0"
            >
              {creating ? "Creating..." : "New key"}
            </button>
          </form>
          {createError && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              {createError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
