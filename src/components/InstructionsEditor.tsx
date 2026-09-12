/**
 * A standing preference about how answers should read — backend D15.
 *
 * The copy matters as much as the control. An instruction changes tone and
 * format and nothing else: it cannot make CeyNex state a figure its sources do
 * not support, cannot change which analyses run, and cannot switch off the
 * grounding check. Saying so here is not reassurance, it is the accurate
 * description of what the box does — and it stops someone typing an instruction
 * that quietly does nothing and concluding the feature is broken.
 */

import { useEffect, useState } from "react";
import type { UserInstruction } from "../lib/accountApi";
import { fetchInstructions, saveInstructions } from "../lib/accountApi";
import { Button, Card, ErrorBanner } from "./ui";

export default function InstructionsEditor() {
  const [state, setState] = useState<UserInstruction | null>(null);
  const [content, setContent] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchInstructions()
      .then((value) => {
        if (!live) return;
        setState(value);
        setContent(value.content);
        setEnabled(value.enabled);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Could not load instructions.");
      });
    return () => {
      live = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await saveInstructions(content, enabled);
      setState(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const max = state?.max_chars ?? 2000;

  return (
    <Card className="p-5">
      <h3 className="font-medium text-gray-900 mb-1">How answers are written</h3>
      <p className="text-sm text-gray-600 mb-3">
        Applies to the wording of answers only — length, tone, formatting. It cannot change
        which analyses run, and it cannot make CeyNex state a figure its sources do not
        support.
      </p>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <label htmlFor="user-instructions" className="block text-xs text-gray-600 mb-1">
        Your instruction
      </label>
      <textarea
        id="user-instructions"
        rows={4}
        value={content}
        maxLength={max}
        disabled={!state || saving}
        onChange={(e) => {
          setContent(e.target.value);
          setSaved(false);
        }}
        placeholder="e.g. Keep answers to three sentences and lead with the number."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-teal-600 disabled:bg-gray-100"
      />
      <p className="text-xs text-gray-500 mt-1">
        {content.length} / {max} characters
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!state || saving}
            onChange={(e) => {
              setEnabled(e.target.checked);
              setSaved(false);
            }}
            className="rounded border-gray-300 text-teal-700
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-teal-600"
          />
          Apply this to my answers
        </label>
        <Button size="sm" disabled={!state || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {/* Announced, not just coloured — the save is otherwise silent. */}
        <span role="status" aria-live="polite" className="text-sm text-teal-700">
          {saved ? "Saved." : ""}
        </span>
      </div>
    </Card>
  );
}
