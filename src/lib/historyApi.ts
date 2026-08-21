import { getToken } from "./tokenStorage";

/**
 * Real GET /api/history (+ the save/unsave actions), proxied same-origin the
 * same way as queryApi.ts. Unlike a query itself, history genuinely requires
 * being signed in -- there's no anonymous history to show -- so every call
 * here throws if there's no token rather than silently returning an empty
 * list, letting the caller tell "not signed in" apart from "signed in, no
 * history yet".
 */

export interface HistoryItem {
  id: number;
  query: string;
  answer: string;
  confidence: number;
  degraded: boolean;
  asked_at: string;
  saved: boolean;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  return { authorization: `Bearer ${token}` };
}

export async function fetchHistory(options?: { savedOnly?: boolean }): Promise<HistoryItem[]> {
  const query = options?.savedOnly ? "?saved=true" : "";
  const res = await fetch(`/api/history${query}`, { headers: authHeaders() });

  if (!res.ok) {
    throw new Error(`Couldn't load history (${res.status}).`);
  }

  const data: { items: HistoryItem[] } = await res.json();
  return data.items;
}

async function setSaved(id: number, saved: boolean): Promise<void> {
  const res = await fetch(`/api/history/${id}/${saved ? "save" : "unsave"}`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Couldn't ${saved ? "save" : "unsave"} that query (${res.status}).`);
  }
}

export function saveQuery(id: number): Promise<void> {
  return setSaved(id, true);
}

export function unsaveQuery(id: number): Promise<void> {
  return setSaved(id, false);
}
