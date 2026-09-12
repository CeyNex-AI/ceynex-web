/**
 * The one question CeyNex asks back (backend deviation D13).
 *
 * Shown only when a deterministic gate found an ambiguity that would otherwise
 * lose part of what the reader meant — most often two commodities in one
 * question, where `parse_intent` silently keeps the first and drops the second.
 *
 * **Accessibility is load-bearing here, not decoration.** SRS 3.2.3 / 3.6.1 /
 * 3.9.x require WCAG Level AA, and a card that appears mid-stream is exactly the
 * kind of component that breaks it: a screen-reader user who is listening to a
 * trace has no idea a question just arrived. So focus moves here on appearance,
 * the card is a labelled `role="group"`, the options are real buttons with
 * `aria-pressed`, and nothing depends on colour — a chosen chip carries a check
 * mark as well as a fill.
 *
 * "Just answer it" is never hidden. A gate with no way past it is a wall.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

export interface ClarifyPrompt {
  pending_id: number;
  question: string;
  options: string[];
  allow_skip: boolean;
  original_query: string;
  kind?: string;
  method?: string;
}

export default function ClarifyCard({
  prompt,
  busy,
  onAnswer,
  onSkip,
}: {
  prompt: ClarifyPrompt;
  busy?: boolean;
  onAnswer: (answers: string[]) => void;
  onSkip: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [free, setFree] = useState("");
  const heading = useRef<HTMLParagraphElement | null>(null);

  // The reader was watching a trace scroll past; without this the question is
  // just more text going by, and for a screen reader it is nothing at all.
  useEffect(() => {
    heading.current?.focus();
  }, [prompt.pending_id]);

  function toggle(option: string) {
    setChosen((current) =>
      current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
    );
  }

  const answers = [...chosen, ...(free.trim() ? [free.trim()] : [])];

  return (
    <li>
      <section
        role="group"
        aria-labelledby={`clarify-${prompt.pending_id}`}
        className="border border-teal-200 bg-teal-50/60 rounded-lg p-4 space-y-3"
      >
        <p
          id={`clarify-${prompt.pending_id}`}
          ref={heading}
          tabIndex={-1}
          className="text-sm font-medium text-gray-900 focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-teal-600 rounded"
        >
          {prompt.question}
        </p>

        {prompt.options.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {prompt.options.map((option) => {
              const on = chosen.includes(option);
              return (
                <li key={option}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => toggle(option)}
                    className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset
                                focus-visible:outline-2 focus-visible:outline-offset-2
                                focus-visible:outline-teal-600 disabled:opacity-50 ${
                                  on
                                    ? "bg-teal-700 text-white ring-teal-700"
                                    : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                                }`}
                  >
                    {/* Never colour alone: the fill says "chosen" to most
                        readers and the tick says it to the rest. */}
                    <span aria-hidden="true">{on ? "✓ " : ""}</span>
                    {option.replace(/_/g, " ")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div>
          <label
            htmlFor={`clarify-free-${prompt.pending_id}`}
            className="block text-xs text-gray-600 mb-1"
          >
            Or say it in your own words
          </label>
          <input
            id={`clarify-free-${prompt.pending_id}`}
            value={free}
            disabled={busy}
            onChange={(e) => setFree(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && answers.length) {
                e.preventDefault();
                onAnswer(answers);
              }
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-teal-600 disabled:bg-gray-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={busy || answers.length === 0} onClick={() => onAnswer(answers)}>
            Continue
          </Button>
          {prompt.allow_skip && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={onSkip}>
              Just answer it as asked
            </Button>
          )}
        </div>
      </section>
    </li>
  );
}
