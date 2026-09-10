/**
 * Client-side, advisory only. There is no server-side strength check — the
 * backend enforces just the 8-char floor. This nudges toward better choices
 * and flags a password that already appears in a public breach corpus, via
 * HaveIBeenPwned's k-anonymity range API (only the first 5 chars of the SHA-1
 * ever leave the browser). Both are best-effort: a blocked or offline pwned
 * check shows nothing rather than failing the form.
 */

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
const WEAK_PREFIX = /^(?:1234|12345|abcd|qwer|password|passw0rd|letmein|welcome|admin|iloveyou)/i;

export function scorePassword(pw: string): Strength {
  if (!pw) return { score: 0, label: "" };

  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes >= 2) score += 1;
  if (classes >= 3 && pw.length >= 10) score += 1;

  // Obvious throwaways can't score above "weak" no matter their length.
  if (/^(.)\1+$/.test(pw) || WEAK_PREFIX.test(pw)) score = Math.min(score, 1);

  const clamped = Math.max(0, Math.min(4, score)) as Strength["score"];
  return { score: clamped, label: LABELS[clamped] };
}

/**
 * HIBP range check. Returns the number of times the password appears in the
 * breach corpus, `0` if it doesn't, or `-1` if the check couldn't run
 * (offline, blocked by CSP, no SubtleCrypto).
 */
export async function pwnedCount(pw: string): Promise<number> {
  if (!pw || typeof crypto === "undefined" || !crypto.subtle) return -1;
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = hex.slice(0, 5);
    const suffix = hex.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return -1;

    for (const line of (await res.text()).split("\n")) {
      const [suf, count] = line.trim().split(":");
      if (suf === suffix) return Number.parseInt(count, 10) || 0;
    }
    return 0;
  } catch {
    return -1;
  }
}
