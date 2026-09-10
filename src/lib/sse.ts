/**
 * Server-sent events, parsed by hand — the pure half of `streamChat.ts`.
 *
 * `EventSource` is GET-only and cannot set an Authorization header, and the
 * chat endpoint needs a JSON body and a bearer token, so the framing is parsed
 * here. The format is four rules, and they have to be all four:
 *
 * 1. Frames are separated by a blank line (`\n\n`).
 * 2. A line starting `:` is a comment. The server sends one every 15s to keep
 *    nginx's 60s `proxy_read_timeout` from firing; it is ignored, not parsed.
 * 3. A chunk boundary can fall anywhere, including mid-frame and mid-UTF-8
 *    character. The caller decodes with `TextDecoder({stream: true})`, which
 *    handles the second; `FrameBuffer` handles the first.
 * 4. `id:` numbers the frame. It is what makes a dropped stream resumable: the
 *    reader reports the last one it saw and gets everything after it.
 *
 * No DOM, no fetch — so it is tested byte by byte without a browser.
 */

export interface SseFrame {
  /** The frame's `id:` — the turn's own sequence number — when it has one. */
  id?: number;
  event: string;
  data: Record<string, unknown>;
}

/** One complete frame, or null for a heartbeat, an empty block or bad JSON. */
export function parseFrame(block: string): SseFrame | null {
  const trimmed = block.trim();
  if (!trimmed || trimmed.startsWith(":")) return null; // heartbeat

  let event = "message";
  let id: number | undefined;
  const dataLines: string[] = [];
  for (const line of trimmed.split("\n")) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    else if (line.startsWith("id:")) {
      const parsed = Number(line.slice(3).trim());
      if (Number.isInteger(parsed)) id = parsed;
    }
  }
  if (dataLines.length === 0) return null;

  try {
    const data = JSON.parse(dataLines.join("\n"));
    if (data === null || typeof data !== "object") return null;
    return { id, event, data };
  } catch {
    // A malformed frame is the server's bug, not a reason to tear down a
    // stream that is otherwise delivering. Skip it and keep reading.
    return null;
  }
}

/**
 * Accumulates decoded text and hands back every complete frame in it.
 *
 * Everything up to the last blank line is complete frames; the remainder is a
 * partial frame the next chunk finishes.
 */
export class FrameBuffer {
  private buffer = "";

  push(text: string): SseFrame[] {
    this.buffer += text;
    const frames: SseFrame[] = [];
    let split = this.buffer.indexOf("\n\n");
    while (split !== -1) {
      const frame = parseFrame(this.buffer.slice(0, split));
      this.buffer = this.buffer.slice(split + 2);
      if (frame) frames.push(frame);
      split = this.buffer.indexOf("\n\n");
    }
    return frames;
  }

  /**
   * What is left when the stream ends. A server that closes without a trailing
   * blank line still has one frame buffered; ours always sends one, but a proxy
   * need not preserve it.
   */
  flush(): SseFrame[] {
    const rest = this.buffer;
    this.buffer = "";
    const frame = rest.trim() ? parseFrame(rest) : null;
    return frame ? [frame] : [];
  }
}

/**
 * Remembers the highest frame number seen, so frames a resume replays twice —
 * the server sends everything after the number we reported, but a frame can be
 * in flight when the connection drops — are delivered exactly once.
 */
export class SeqTracker {
  last = 0;

  /** True the first time a frame is seen; false for a replay. */
  accept(frame: SseFrame): boolean {
    if (frame.id === undefined) return true; // unnumbered: nothing to dedupe on
    if (frame.id <= this.last) return false;
    this.last = frame.id;
    return true;
  }
}
