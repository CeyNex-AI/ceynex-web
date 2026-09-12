import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  createApiKey,
  fetchApiKeys,
  fetchInstructions,
  fetchPreferences,
  fetchUsage,
  revokeApiKey,
  savePreferences,
  type ApiKeyItem,
  type NewApiKey,
  type NotificationPreferences,
  type UsageSummary,
} from "../lib/accountApi";
import PasswordStrength from "../components/PasswordStrength";
import { ROLE_LABELS, type Role } from "../lib/roles";
import { useAuth } from "../lib/useAuth";
import InstructionsEditor from "../components/InstructionsEditor";
import UsagePanel from "../components/UsagePanel";
import usePageTitle from "../lib/usePageTitle";
import { SectionNav, SummaryTile } from "../components/ui";

const PREFERENCE_LABELS: Record<keyof NotificationPreferences, string> = {
  dq_flag_alerts: "Data-quality flags on data I use",
  forecast_updates: "Forecast and model updates",
  weekly_digest: "Weekly summary digest",
};

const SECTIONS = [
  { id: "session", label: "Session" },
  { id: "password", label: "Password" },
  { id: "email", label: "Email" },
  { id: "notifications", label: "Notifications" },
  { id: "instructions", label: "Answer style" },
  { id: "usage", label: "Usage" },
  { id: "keys", label: "API keys" },
  { id: "delete", label: "Delete account" },
] as const;

type Section = "overview" | (typeof SECTIONS)[number]["id"];

const NAV_ITEMS: { id: Section; label: string }[] = [{ id: "overview", label: "Overview" }, ...SECTIONS];

function InstructionsSummary({ onView }: { onView: () => void }) {
  const [state, setState] = useState<{ content: string; enabled: boolean } | null>(null);
  useEffect(() => {
    fetchInstructions()
      .then(setState)
      .catch(() => setState({ content: "", enabled: false }));
  }, []);
  if (!state) return <SummaryTile title="Answer style" onView={onView}>Loading…</SummaryTile>;
  if (!state.content.trim()) {
    return <SummaryTile title="Answer style" onView={onView}>No custom instruction set.</SummaryTile>;
  }
  return (
    <SummaryTile title="Answer style" onView={onView}>
      {state.enabled ? "Active" : "Saved, but off"}: “
      {state.content.length > 60 ? `${state.content.slice(0, 60)}…` : state.content}”
    </SummaryTile>
  );
}

function UsageSummaryTile({ onView }: { onView: () => void }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  useEffect(() => {
    fetchUsage(7, "user")
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);
  return (
    <SummaryTile title="Usage" onView={onView}>
      {usage
        ? `$${usage.total_cost_usd.toFixed(2)} · ${usage.total_calls.toLocaleString()} model calls, last 7 days`
        : "Loading…"}
    </SummaryTile>
  );
}

export default function Account() {
  usePageTitle("Account");
  const { userId, role, logout, changeEmail, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<Section>("overview");

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

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const [emailNew, setEmailNew] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaved, setEmailSaved] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (pwNew.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("The two new passwords don't match.");
      return;
    }
    if (pwNew === pwCurrent) {
      setPwError("New password must be different from the current one.");
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwCurrent, pwNew);
      setPwSaved(true);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Couldn't change password.");
    } finally {
      setPwSaving(false);
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

  async function handleChangeEmail(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSaved(false);
    if (!emailNew.trim() || !emailPw) {
      setEmailError("Enter the new email and your current password.");
      return;
    }
    if (emailNew.trim().toLowerCase() === userId?.toLowerCase()) {
      setEmailError("That's already your email.");
      return;
    }
    setEmailSaving(true);
    try {
      await changeEmail(emailPw, emailNew.trim());
      setEmailSaved(true);
      setEmailNew("");
      setEmailPw("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Couldn't change email.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    if (deleteConfirm !== "DELETE") {
      setDeleteError('Type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(deletePw);
      navigate("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete the account.");
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Account</h1>
          <p className="text-sm text-gray-500">Your CeyNex session, sign-in details, preferences, how answers are written, usage and limits, and API keys.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <SectionNav section={section} onChange={setSection} items={NAV_ITEMS} ariaLabel="Account sections" />

          <div className="flex-1 min-w-0 space-y-6">
            {section === "overview" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SummaryTile title="Session" onView={() => setSection("session")}>
                  {userId ?? "Not signed in"}
                  {role ? ` · ${ROLE_LABELS[role as Role]}` : ""}
                </SummaryTile>
                <SummaryTile title="Password" onView={() => setSection("password")}>
                  Change your sign-in password.
                </SummaryTile>
                <SummaryTile title="Email" onView={() => setSection("email")}>
                  Change your sign-in email.
                </SummaryTile>
                <SummaryTile title="Notifications" onView={() => setSection("notifications")}>
                  {prefs
                    ? `${Object.values(prefs).filter(Boolean).length} of ${Object.keys(PREFERENCE_LABELS).length} enabled`
                    : "Loading…"}
                </SummaryTile>
                <InstructionsSummary onView={() => setSection("instructions")} />
                <UsageSummaryTile onView={() => setSection("usage")} />
                <SummaryTile title="API keys" onView={() => setSection("keys")}>
                  {keys ? `${keys.filter((k) => !k.revoked).length} active` : "Loading…"}
                </SummaryTile>
                <SummaryTile title="Delete account" onView={() => setSection("delete")}>
                  Permanent — removes your account and everything in it.
                </SummaryTile>
              </div>
            )}

            {section === "session" && (
              <div className="max-w-md cx-panel-flat p-6 space-y-4">
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
                <button type="button" onClick={handleLogout} className="cx-btn-secondary w-full text-sm px-4 py-2.5">
                  Sign out
                </button>
              </div>
            )}

            {section === "password" && (
              <div className="max-w-md cx-panel-flat p-6 space-y-4">
                <h2 className="cx-panel-title">Password</h2>
                <p className="text-xs text-gray-500">
                  You'll stay signed in on this device after changing it.
                </p>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Current password"
                    aria-label="Current password"
                    className="cx-input w-full text-sm px-3 py-2"
                  />
                  <div>
                    <input
                      type="password"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      autoComplete="new-password"
                      placeholder="New password (8+ characters)"
                      aria-label="New password"
                      className="cx-input w-full text-sm px-3 py-2"
                    />
                    <PasswordStrength password={pwNew} />
                  </div>
                  <input
                    type="password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    aria-label="Confirm new password"
                    className="cx-input w-full text-sm px-3 py-2"
                  />
                  {pwError && (
                    <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                      {pwError}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                      className="cx-btn-primary text-sm px-4 py-2"
                    >
                      {pwSaving ? "Changing..." : "Change password"}
                    </button>
                    {pwSaved && !pwSaving && <span className="text-xs text-teal-700">Password changed.</span>}
                  </div>
                </form>
              </div>
            )}

            {section === "email" && (
              <div className="max-w-md cx-panel-flat p-6 space-y-4">
                <h2 className="cx-panel-title">Email</h2>
                <p className="text-xs text-gray-500">
                  Your history and API keys move with it. Other devices are signed out; this one stays in.
                </p>
                <form onSubmit={handleChangeEmail} className="space-y-3">
                  <input
                    type="email"
                    value={emailNew}
                    onChange={(e) => setEmailNew(e.target.value)}
                    autoComplete="email"
                    placeholder="New email"
                    aria-label="New email"
                    className="cx-input w-full text-sm px-3 py-2"
                  />
                  <input
                    type="password"
                    value={emailPw}
                    onChange={(e) => setEmailPw(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Current password"
                    aria-label="Current password to confirm the email change"
                    className="cx-input w-full text-sm px-3 py-2"
                  />
                  {emailError && (
                    <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                      {emailError}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={emailSaving || !emailNew || !emailPw}
                      className="cx-btn-primary text-sm px-4 py-2"
                    >
                      {emailSaving ? "Changing..." : "Change email"}
                    </button>
                    {emailSaved && !emailSaving && <span className="text-xs text-teal-700">Email changed.</span>}
                  </div>
                </form>
              </div>
            )}

            {section === "notifications" && (
              <div className="max-w-md cx-panel-flat p-6 space-y-4">
                <h2 className="cx-panel-title">Notification preferences</h2>
                <p className="text-xs text-gray-500">
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
                          className="h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-500"
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
            )}

            {section === "instructions" && (
              <div className="max-w-md">
                <InstructionsEditor />
              </div>
            )}

            {section === "usage" && (
              <div className="space-y-4">
                <h2 className="cx-panel-title">Usage and limits</h2>
                <UsagePanel />
              </div>
            )}

            {section === "keys" && (
              <div className="cx-panel-flat p-6 space-y-4">
                <h2 className="cx-panel-title">API keys</h2>
                <p className="text-xs text-gray-500">
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
                          <div className="text-xs text-gray-500">
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
            )}

            {section === "delete" && (
              <div className="max-w-md cx-panel-flat p-6 space-y-3 border border-red-200">
                <h2 className="cx-panel-title text-red-700">Delete account</h2>
                <p className="text-xs text-gray-500">
                  Permanent. Removes your account, saved queries, history, and API keys. There's no undo.
                </p>
                {!showDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="text-sm font-medium text-red-700 hover:text-red-800 border border-red-300 rounded-md px-3 py-2"
                  >
                    Delete my account
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-3">
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      autoComplete="off"
                      placeholder="Type DELETE to confirm"
                      aria-label="Type DELETE to confirm account deletion"
                      className="cx-input w-full text-sm px-3 py-2"
                    />
                    <input
                      type="password"
                      value={deletePw}
                      onChange={(e) => setDeletePw(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Current password"
                      aria-label="Current password to confirm account deletion"
                      className="cx-input w-full text-sm px-3 py-2"
                    />
                    {deleteError && (
                      <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                        {deleteError}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={deleting || deleteConfirm !== "DELETE" || !deletePw}
                        className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-md px-4 py-2"
                      >
                        {deleting ? "Deleting..." : "Permanently delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDelete(false);
                          setDeleteConfirm("");
                          setDeletePw("");
                          setDeleteError(null);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
