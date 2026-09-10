/**
 * What `/query` renders: the conversational surface, or the original form.
 *
 * The SRS §3.9.1 page/requirement cross-index names a **Main Query** page —
 * "a single text input box where a user types a natural language question…and a
 * submit button" — and `make eval`'s 30 questions target that shape. Replacing
 * it outright would break a traceability claim for a UI preference.
 *
 * So both live here and the toggle is explicit. Chat is the default because it
 * is the better product; classic mode is one click away, is what a marker is
 * pointed at, and is the thing to fall back to if the streaming transport is
 * ever unavailable behind a proxy that buffers.
 *
 * The choice is remembered per browser. `localStorage` can throw outright in a
 * private window or with site data blocked, so every access is guarded and an
 * unreadable store simply means the default.
 */

import { useState } from "react";
import Chat from "./Chat";
import Query from "./Query";

const MODE_KEY = "ceynex_query_mode";

type Mode = "chat" | "classic";

function storedMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "classic" ? "classic" : "chat";
  } catch {
    return "chat";
  }
}

function remember(mode: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* a remembered preference is a convenience, never a requirement */
  }
}

export default function QueryWorkspace() {
  const [mode, setMode] = useState<Mode>(storedMode);

  function choose(next: Mode) {
    setMode(next);
    remember(next);
  }

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Query interface"
        className="flex items-center gap-1 text-sm print:hidden"
      >
        {(["chat", "classic"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            aria-pressed={mode === option}
            className={`px-3 py-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-teal-600 ${
                          mode === option
                            ? "bg-teal-50 text-teal-700 font-medium"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
          >
            {option === "chat" ? "Chat" : "Single question"}
          </button>
        ))}
      </div>

      {mode === "chat" ? <Chat /> : <Query />}
    </div>
  );
}
