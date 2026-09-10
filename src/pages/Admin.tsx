import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  type DQFlagItem,
  type LLMStatus,
  type ModelSummary,
  type PipelineRunItem,
  type ProviderStatusItem,
  type UserAdminItem,
  createUser,
  fetchDQFlags,
  fetchLLMStatus,
  fetchModels,
  fetchPipelineStatus,
  fetchUsers,
  generatePassword,
  resolveDQFlag,
  retrainModel,
  setUserDisabled,
  setUserPassword,
  setUserRole,
  triggerIngest,
} from "../lib/adminApi";
import { ALL_ROLES, ROLE_LABELS, type Role } from "../lib/roles";
import { type Theme } from "../lib/siteApi";
import { useTheme } from "../lib/useTheme";
import timeAgo from "../lib/timeAgo";
import { useAuth } from "../lib/useAuth";
import usePageTitle from "../lib/usePageTitle";

interface HealthResponse {
  status: string;
  postgres: boolean;
  neo4j: boolean;
  llm: boolean;
  detail?: {
    fact_trade_rows?: number;
    reasoning?: string;
  };
}

function StatusRow({ label, up, note }: { label: string; up: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`w-2 h-2 rounded-full ${up ? "bg-emerald-500" : "bg-red-500"}`} />
        <span className="text-sm text-gray-800">{label}</span>
      </div>
      <span className={`text-xs font-medium ${up ? "text-emerald-700" : "text-red-700"}`}>
        {note ?? (up ? "up" : "down")}
      </span>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="cx-panel-flat p-5">
      <h2 className="cx-panel-title">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mt-3" />}
      {children}
    </div>
  );
}

const PROVIDER_STATUS_STYLE: Record<
  ProviderStatusItem["status"],
  { dot: string; text: string; label: string }
> = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-700", label: "up" },
  down: { dot: "bg-red-500", text: "text-red-700", label: "down" },
  // Amber, not red: calls are deliberately being skipped to protect the
  // daily spend cap (R5) -- this is not GPT-4o itself failing.
  cap_reached: { dot: "bg-amber-500", text: "text-amber-700", label: "spend cap reached" },
  not_configured: { dot: "bg-gray-300", text: "text-gray-400", label: "not configured" },
  unknown: { dot: "bg-gray-300", text: "text-gray-400", label: "not checked yet" },
};

/** One provider's row in the LLM status card -- richer than StatusRow's
 * plain up/down, since "not configured"/"spend cap reached"/"not checked
 * yet" all need to read differently from a real outage. */
function ProviderStatusRow({ label, item }: { label: string; item: ProviderStatusItem }) {
  const style = PROVIDER_STATUS_STYLE[item.status] ?? PROVIDER_STATUS_STYLE.unknown;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 pt-0.5">
        <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
        <span className="text-sm text-gray-800">{label}</span>
      </div>
      <div className="text-right min-w-0">
        <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
        {item.status === "down" && item.last_error && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[220px]" title={item.last_error}>
            {item.last_error}
          </p>
        )}
        {item.last_checked_at && (item.status === "ok" || item.status === "down") && (
          <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(item.last_checked_at)}</p>
        )}
      </div>
    </div>
  );
}

/**
 * User request: an admin should be able to see at a glance whether GPT-4o
 * (OpenAI, primary) needs fixing while OpenRouter's free failsafe covers the
 * gap in the meantime -- rather than only the single coarse "LLM
 * reasoning: up/degraded" row the System status card above already shows.
 *
 * Based on the outcome of the most recent real query to each provider, not
 * a live ping -- free, at the cost of only being as fresh as the last actual
 * query (see ceynex-core's LLMReasoningClient.provider_status() docstring).
 */
function LLMStatusCard() {
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLLMStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load LLM status."));
  }, []);

  return (
    <Card title="LLM providers" subtitle="From the most recent real query to each, not a live check.">
      {error && (
        <p role="alert" className="text-sm text-red-700 mb-2">
          {error}
        </p>
      )}
      {!status && !error && <p className="text-sm text-gray-400">Loading…</p>}
      {status && (
        <>
          <ProviderStatusRow label="OpenAI (GPT-4o)" item={status.openai} />
          <ProviderStatusRow label="OpenRouter (failsafe)" item={status.openrouter} />
        </>
      )}
    </Card>
  );
}

/** SRS 3.1.10 -- one registered model per row, with a retrain trigger. */
function ModelsCard() {
  const [models, setModels] = useState<ModelSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retraining, setRetraining] = useState<string | null>(null);

  function reload() {
    fetchModels()
      .then(setModels)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load models."));
  }

  useEffect(reload, []);

  async function handleRetrain(m: ModelSummary) {
    const key = `${m.sector}/${m.item}/${m.target}`;
    setRetraining(key);
    setError(null);
    try {
      await retrainModel(m.sector, m.item, m.target);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrain failed.");
    } finally {
      setRetraining(null);
    }
  }

  return (
    <Card title="Models" subtitle="Registered forecast models. Retrain refits the same model class on the latest data.">
      {error && (
        <p role="alert" className="text-sm text-red-700 mb-2">
          {error}
        </p>
      )}
      {!models && !error && <p className="text-sm text-gray-400">Loading…</p>}
      {models && models.length === 0 && (
        <p className="text-sm text-gray-400">No models registered yet.</p>
      )}
      {models && models.length > 0 && (
        <ul className="space-y-2">
          {models.map((m) => {
            const key = `${m.sector}/${m.item}/${m.target}@${m.version}`;
            const busy = retraining === `${m.sector}/${m.item}/${m.target}`;
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-md px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-gray-800 truncate">
                    {m.sector}/{m.item} <span className="text-gray-400">· {m.target}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.model_class} · {m.version}
                    {m.metrics?.mape !== undefined && ` · MAPE ${(m.metrics.mape * 100).toFixed(1)}%`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleRetrain(m)}
                  className="cx-btn-secondary shrink-0 text-xs px-2.5 py-1"
                >
                  {busy ? "Retraining…" : "Retrain"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/**
 * SRS 3.1.7 trigger + SRS 3.5.4's own ingest_run status.
 *
 * Two buttons, not one "run everything": a real click here found that EDB and
 * JAAF (apparel, offline cached reports) finish in well under a second, but
 * Comtrade's public preview endpoint is rate-limited and queried one
 * (HS code, year) request at a time -- a fresh pull took ~100s end to end.
 * The HTTP response waits for the real work either way (see
 * ceynex/api/routes/admin.py's docstring), so a default button that silently
 * blocks for a minute-plus is a bad first click. EDB+JAAF is both the fast
 * path and the one this project's apparel side actually owns; Comtrade stays
 * one explicit click away rather than folded into "run everything".
 */
function PipelineCard() {
  const [runs, setRuns] = useState<PipelineRunItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<string | null>(null);

  function reload() {
    fetchPipelineStatus()
      .then(setRuns)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load pipeline status."));
  }

  useEffect(reload, []);

  async function handleIngest(label: string, sources?: string[]) {
    setIngesting(label);
    setError(null);
    try {
      await triggerIngest(sources);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed.");
    } finally {
      setIngesting(null);
    }
  }

  return (
    <Card title="Data pipeline">
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          disabled={ingesting !== null}
          onClick={() => handleIngest("apparel", ["edb", "jaaf"])}
          className="cx-btn-primary text-xs px-3 py-1.5"
        >
          {ingesting === "apparel" ? "Running…" : "Run ingest (EDB + JAAF)"}
        </button>
        <button
          type="button"
          disabled={ingesting !== null}
          onClick={() => handleIngest("comtrade", ["comtrade"])}
          title="Rate-limited and queried per HS code/year -- can take a minute or more"
          className="cx-btn-secondary text-xs px-3 py-1.5"
        >
          {ingesting === "comtrade" ? "Running (can take a while)…" : "Run ingest (Comtrade, slow)"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 mb-2">
          {error}
        </p>
      )}
      {!runs && !error && <p className="text-sm text-gray-400">Loading…</p>}
      {runs && runs.length === 0 && <p className="text-sm text-gray-400">No ingest runs yet.</p>}
      {runs && runs.length > 0 && (
        <ul className="space-y-1.5">
          {runs.slice(0, 8).map((r) => (
            <li
              key={r.run_id}
              // Grid, not flex justify-between: a flex row spaces its items
              // based on that row's own content width, so with values as
              // different as "658 rows" vs "6,218 rows" the rows/status/time
              // columns drift out of alignment from one row to the next.
              // Grid sizes each column once, from the widest cell in that
              // column across every row, so they always line up.
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 text-sm border-b border-gray-100 last:border-0 pb-1.5 last:pb-0"
            >
              <span className="text-gray-800 truncate">{r.source_id}</span>
              <span className="text-xs text-gray-400 text-right">{r.rows_written.toLocaleString()} rows</span>
              <span
                className={`text-xs font-medium text-right ${r.status === "success" ? "text-emerald-700" : "text-red-700"}`}
              >
                {r.status}
              </span>
              <span className="text-xs text-gray-400 text-right">{timeAgo(r.started_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** SRS 3.1.8's flags, reviewed here (SRS 3.5.4) rather than only ever queried. */
function DQFlagsCard() {
  const [flags, setFlags] = useState<DQFlagItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);

  function reload() {
    fetchDQFlags()
      .then(setFlags)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load DQ flags."));
  }

  useEffect(reload, []);

  async function handleResolve(flagId: number) {
    setResolving(flagId);
    setError(null);
    try {
      await resolveDQFlag(flagId);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resolve the flag.");
    } finally {
      setResolving(null);
    }
  }

  const severityColor: Record<string, string> = {
    minor: "text-gray-500 bg-gray-100",
    material: "text-amber-700 bg-amber-50",
    severe: "text-red-700 bg-red-50",
  };

  return (
    <Card title="Data quality review" subtitle="Cross-source discrepancies, unresolved first.">
      {error && (
        <p role="alert" className="text-sm text-red-700 mb-2">
          {error}
        </p>
      )}
      {!flags && !error && <p className="text-sm text-gray-400">Loading…</p>}
      {flags && flags.length === 0 && <p className="text-sm text-gray-400">No flags recorded.</p>}
      {flags && flags.length > 0 && (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li
              key={f.flag_id}
              className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-md px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-gray-800 truncate">
                  {f.item ?? "N/A"}{" "}
                  {f.severity && (
                    <span
                      className={`text-[10px] font-medium rounded px-1.5 py-0.5 ml-1 ${severityColor[f.severity] ?? "text-gray-500 bg-gray-100"}`}
                    >
                      {f.severity}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {f.source_a} {f.value_a ?? "?"} vs {f.source_b} {f.value_b ?? "?"}
                  {f.pct_diff !== null && ` (${f.pct_diff.toFixed(1)}% diff)`}
                </p>
              </div>
              {f.resolved ? (
                <span className="shrink-0 text-xs text-gray-400">resolved</span>
              ) : (
                <button
                  type="button"
                  disabled={resolving === f.flag_id}
                  onClick={() => handleResolve(f.flag_id)}
                  className="cx-btn-secondary shrink-0 text-xs px-2.5 py-1"
                >
                  {resolving === f.flag_id ? "Resolving…" : "Resolve"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Site-wide, not per-browser: flipping this changes what every visitor sees,
 * signed in or not (src/lib/theme.tsx). There is deliberately no "preview"
 * step -- the toggle *is* the change, same posture as Retrain/Resolve above.
 */
function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState<Theme | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(next: Theme) {
    if (next === theme || saving) return;
    setSaving(next);
    setError(null);
    try {
      await setTheme(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change the site theme.");
    } finally {
      setSaving(null);
    }
  }

  const optionClass = (option: Theme) =>
    `text-xs font-medium rounded-md px-3 py-1.5 border transition-colors ${
      theme === option
        ? "bg-teal-50 text-teal-700 border-teal-200"
        : "text-gray-500 border-gray-200 hover:text-gray-700"
    }`;

  return (
    <Card title="Appearance" subtitle="Changes what every visitor sees, not just this browser.">
      {error && (
        <p role="alert" className="text-sm text-red-700 mb-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => handlePick("classic")}
          aria-pressed={theme === "classic"}
          className={optionClass("classic")}
        >
          {saving === "classic" ? "Saving…" : "Classic"}
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => handlePick("signal-deck")}
          aria-pressed={theme === "signal-deck"}
          className={optionClass("signal-deck")}
        >
          {saving === "signal-deck" ? "Saving…" : "Signal Deck"}
        </button>
      </div>
    </Card>
  );
}

/**
 * RBAC (SRS 3.5.4): every account, its role, and its enabled state. The role
 * dropdown and the disable/enable button are live actions -- same posture as
 * Retrain/Resolve, no separate save step. The backend refuses (409) anything
 * that would remove the last admin, and that message is shown inline rather
 * than the change silently not sticking.
 */
function UsersCard({ currentEmail }: { currentEmail: string | null }) {
  const [users, setUsers] = useState<UserAdminItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // create form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("researcher");
  const [creating, setCreating] = useState(false);

  // one-time reveal of a generated reset password
  const [resetPw, setResetPw] = useState<{ email: string; password: string } | null>(null);

  function reload() {
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load users."));
  }

  useEffect(reload, []);

  async function runAction<T>(id: number, action: () => Promise<T>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(u: UserAdminItem) {
    setBusyId(u.id);
    setError(null);
    setResetPw(null);
    try {
      const password = generatePassword();
      await setUserPassword(u.id, password);
      setResetPw({ email: u.email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset that password.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newEmail.trim() || newPassword.length < 8) {
      setError("Enter an email and a password of at least 8 characters.");
      return;
    }
    setCreating(true);
    try {
      await createUser(newEmail.trim(), newPassword, newRole);
      setNewEmail("");
      setNewPassword("");
      setNewRole("researcher");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the user.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card title="Users" subtitle="Accounts, roles, and access. Changes take effect on the next sign-in.">
      {error && (
        <p role="alert" className="text-sm text-red-700 mb-2">
          {error}
        </p>
      )}

      {resetPw && (
        <div className="bg-teal-50 border border-teal-200 rounded-md px-4 py-3 space-y-2 mb-4">
          <p className="text-xs text-teal-800">
            New password for <span className="font-medium">{resetPw.email}</span> — copy it now, it
            won't be shown again. Send it to them; they can change it from their Account page.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-teal-200 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">
              {resetPw.password}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(resetPw.password)}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 border border-teal-300 rounded px-2 py-1.5 shrink-0"
            >
              Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => setResetPw(null)}
            className="text-xs text-teal-700 hover:text-teal-800"
          >
            Done
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 mb-4">
        <div className="flex-1 min-w-[10rem]">
          <label htmlFor="new-user-email" className="block text-xs font-medium text-gray-500 mb-1">
            Email
          </label>
          <input
            id="new-user-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="cx-input w-full px-2.5 py-1.5 text-sm"
            placeholder="person@org.lk"
          />
        </div>
        <div className="min-w-[9rem]">
          <label htmlFor="new-user-password" className="block text-xs font-medium text-gray-500 mb-1">
            Temp password
          </label>
          <input
            id="new-user-password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="off"
            className="cx-input w-full px-2.5 py-1.5 text-sm"
            placeholder="8+ characters"
          />
        </div>
        <div>
          <label htmlFor="new-user-role" className="block text-xs font-medium text-gray-500 mb-1">
            Role
          </label>
          <select
            id="new-user-role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            className="cx-input px-2.5 py-1.5 text-sm"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={creating} className="cx-btn-primary text-xs px-3 py-1.5">
          {creating ? "Adding…" : "Add user"}
        </button>
      </form>

      {!users && !error && <p className="text-sm text-gray-400">Loading…</p>}
      {users && users.length === 0 && <p className="text-sm text-gray-400">No users yet.</p>}
      {users && users.length > 0 && (
        <ul className="space-y-1.5">
          {users.map((u) => {
            const isSelf = currentEmail !== null && u.email === currentEmail;
            const busy = busyId === u.id;
            return (
              <li
                key={u.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 gap-y-1 text-sm border-b border-gray-100 last:border-0 pb-1.5 last:pb-0"
              >
                <span className={`truncate ${u.disabled ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {u.email}
                  {isSelf && <span className="text-gray-400 no-underline"> (you)</span>}
                </span>
                <select
                  value={u.role}
                  disabled={busy}
                  onChange={(e) => runAction(u.id, () => setUserRole(u.id, e.target.value))}
                  className="cx-input text-xs px-2 py-1"
                  aria-label={`Role for ${u.email}`}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleResetPassword(u)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:text-gray-300 shrink-0"
                  title={`Generate a new password for ${u.email}`}
                >
                  {busy ? "…" : "Reset pw"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction(u.id, () => setUserDisabled(u.id, !u.disabled))}
                  className="cx-btn-secondary text-xs px-2.5 py-1 shrink-0"
                >
                  {busy ? "…" : u.disabled ? "Enable" : "Disable"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function Admin() {
  usePageTitle("Admin");
  const { role, userId } = useAuth();
  const isAdmin = role === "admin";
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/health")
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then(setHealth)
      .catch(() => setHealthError("Couldn't reach the health endpoint."));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-sm mx-auto">
          <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Admin</h1>
          <div className="cx-panel-flat p-5">
            <p className="text-sm text-gray-600 leading-relaxed">
              This page is restricted to the Admin role. You're signed in as{" "}
              <span className="font-medium text-gray-800">
                {role ? ROLE_LABELS[role] : "a guest"}
              </span>
              .
            </p>
            <Link
              to="/query"
              className="inline-block mt-4 text-sm text-teal-700 hover:text-teal-800 font-medium"
            >
              Back to Query <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Admin</h1>
          <p className="text-sm text-gray-500">
            Retrain, ingest and data-quality review: real actions against the live system (SRS 3.5.4).
          </p>
        </div>

        <UsersCard currentEmail={userId} />

        <AppearanceCard />

        <Card title="System status">
          {healthError && (
            <p role="alert" className="text-sm text-gray-500">
              {healthError}
            </p>
          )}
          {!healthError && !health && <p className="text-sm text-gray-400">Checking system status…</p>}
          {health && (
            <>
              <StatusRow label="Postgres" up={health.postgres} />
              <StatusRow label="Neo4j" up={health.neo4j} />
              <StatusRow label="LLM reasoning" up={health.llm} note={health.llm ? "up" : "degraded"} />
              {health.detail?.fact_trade_rows !== undefined && (
                <div className="pt-3 mt-1 text-xs text-gray-400">
                  {health.detail.fact_trade_rows.toLocaleString()} fact_trade rows
                </div>
              )}
              {health.detail?.reasoning && (
                <div className="text-xs text-gray-400">{health.detail.reasoning}</div>
              )}
            </>
          )}
        </Card>

        <LLMStatusCard />
        <ModelsCard />
        <PipelineCard />
        <DQFlagsCard />
      </div>
    </div>
  );
}
