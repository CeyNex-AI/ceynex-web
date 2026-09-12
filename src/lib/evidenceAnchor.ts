/**
 * Where a `[n]` citation points. One definition, so the id the evidence panel
 * renders and the id the answer scrolls to cannot drift apart.
 */

/** The element id of evidence entry `n` (1-based, as a `[n]` citation counts). */
export function evidenceId(idPrefix: string, n: number): string {
  return `${idPrefix}-${n}`;
}
