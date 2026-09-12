/**
 * 👍 / 👎 on an answer (execution plan §5).
 *
 * Worth more than it looks. `eval/questions.yaml` is 30 questions written before
 * the harness ever ran, and it has no growth path; answers a reader marked wrong
 * are the closest thing to a stream of candidate eval cases this project can
 * get. That is the reason the 👎 path asks for a reason and the 👍 path does not.
 *
 * Only offered on a stored turn, because a rating needs a message id to attach
 * to — a live turn has not been persisted yet.
 */

import { useState } from "react";
import { apiJson } from "../lib/apiFetch";
import { Button } from "./ui";

export default function AnswerFeedback({ messageId }: { messageId: number }) {
  const [rating, setRating] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState(false);
  const [saved, setSaved] = useState(false);

  async function send(value: number, why = "") {
    setRating(value);
    setSaved(false);
    try {
      await apiJson(`/api/chat/messages/${messageId}/feedback`, {
        method: "POST",
        auth: true,
        body: { rating: value, reason: why },
      });
      setSaved(true);
      setAsking(false);
    } catch {
      // Never a banner: a rating that failed to save is not a failed answer.
      setRating(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
      <span className="text-gray-500">Was this useful?</span>
      {[
        { value: 1, glyph: "👍", label: "Yes, this was useful" },
        { value: -1, glyph: "👎", label: "No, this was not useful" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={rating === option.value}
          aria-label={option.label}
          onClick={() => {
            if (option.value === -1) {
              setAsking(true);
              setRating(-1);
            } else {
              void send(1);
            }
          }}
          className={`rounded-md px-2 py-1 ring-1 ring-inset focus-visible:outline-2
                      focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                        rating === option.value
                          ? "bg-teal-50 ring-teal-300"
                          : "bg-white ring-gray-200 hover:bg-gray-50"
                      }`}
        >
          <span aria-hidden="true">{option.glyph}</span>
        </button>
      ))}
      {/* Announced rather than only coloured. */}
      <span role="status" aria-live="polite" className="text-teal-700">
        {saved ? "Thanks — recorded." : ""}
      </span>

      {asking && !saved && (
        <div className="flex items-center gap-2 w-full mt-1">
          <label htmlFor={`why-${messageId}`} className="sr-only">
            What was wrong with this answer?
          </label>
          <input
            id={`why-${messageId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What was wrong? (optional)"
            className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-teal-600"
          />
          <Button size="sm" variant="secondary" onClick={() => void send(-1, reason)}>
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
