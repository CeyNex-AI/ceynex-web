import { useEffect, useState } from "react";
import { pwnedCount, scorePassword } from "../lib/passwordStrength";

/**
 * A 4-segment bar + label under a password field, plus an advisory line if
 * the value turns up in a public breach. The pwned check is debounced and
 * best-effort (see passwordStrength.ts) — it never blocks the form.
 */
export default function PasswordStrength({ password }: { password: string }) {
  const { score, label } = scorePassword(password);
  // Keyed by the exact password it was run for, so a stale result never shows
  // against a value the user has since edited (and no synchronous reset in the
  // effect, which the lint forbids).
  const [checked, setChecked] = useState<{ pw: string; count: number } | null>(null);

  useEffect(() => {
    if (password.length < 4) return;
    let cancelled = false;
    const t = setTimeout(() => {
      pwnedCount(password).then((count) => {
        if (!cancelled) setChecked({ pw: password, count });
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [password]);

  if (!password) return null;

  const pwned = checked && checked.pw === password ? checked.count : -1;
  const fill = ["bg-red-400", "bg-red-400", "bg-amber-400", "bg-teal-500", "bg-emerald-500"][score];

  return (
    <div aria-live="polite">
      <div className="flex gap-1 mt-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? fill : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className="text-xs mt-1">
        <span className="text-gray-400">{label}</span>
        {pwned > 0 && (
          <span className="text-red-600">
            {" "}
            · found in {pwned.toLocaleString()} known breaches — choose another
          </span>
        )}
      </p>
    </div>
  );
}
