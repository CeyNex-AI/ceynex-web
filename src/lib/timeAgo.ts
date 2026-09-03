/**
 * Relative timestamps, in one place.
 *
 * Extracted from Query.tsx and Admin.tsx, which carried byte-identical copies.
 * A third caller (NewsPanel, TrendingNews) is where duplication stops being
 * tolerable, so the copies were removed rather than added to.
 */
export default function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
