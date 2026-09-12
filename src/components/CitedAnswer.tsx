/**
 * Answer prose with `[1]` markers linked to the evidence entry they cite (§7).
 *
 * **Rendered by splitting the string, never by injecting HTML.** This is the one
 * path in the app most tempted toward `dangerouslySetInnerHTML`, and it is the
 * one where it would matter most: the text is model output, and with web search
 * (D14) the evidence beside it includes snippets nobody verified. So the prose is
 * split on a regex and the pieces become React nodes, which React escapes.
 *
 * A marker whose number has no matching evidence entry is rendered as plain
 * text rather than a dead link — the model occasionally cites past the end of
 * the list, and a link to nothing claims a source that does not exist.
 */

import type { Evidence } from "../types/contracts";

const CITATION = /(\[\d{1,2}\])/g;

export default function CitedAnswer({
  text,
  evidence,
  onCite,
}: {
  text: string;
  evidence: Evidence[];
  onCite?: (index: number) => void;
}) {
  if (!text) return null;
  const parts = text.split(CITATION);

  return (
    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        const match = /^\[(\d{1,2})\]$/.exec(part);
        if (!match) return <span key={i}>{part}</span>;

        const index = Number(match[1]);
        const item = evidence[index - 1];
        if (!item) return <span key={i}>{part}</span>;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onCite?.(index)}
            title={`${item.source_id} — ${item.claim}`}
            aria-label={`Source ${index}: ${item.source_id}, ${item.claim}`}
            className="align-super text-[0.7em] font-medium text-teal-700 hover:text-teal-900
                       underline underline-offset-2 mx-0.5 focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-teal-600 rounded"
          >
            [{index}]
          </button>
        );
      })}
    </p>
  );
}
