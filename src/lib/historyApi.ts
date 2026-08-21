import { getToken } from "./tokenStorage";

/**
 * Real GET /api/history, proxied same-origin the same way as queryApi.ts.
 * Unlike a query itself, history genuinely requires being signed in --
 * there's no anonymous history to show -- so this throws if there's no token
 * rather than silently returning an empty list, letting the caller tell "not
 * signed in" apart from "signed in, no history yet".
 */

export interface HistoryItem {
  id: number;
  query: string;
  answer: string;
  confidence: number;
  degraded: boolean;
  asked_at: string;
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const token = getToken();
  if (!token) {
    throw new Error("Not signed in.");
  }

  const res = await fetch("/api/history", {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Couldn't load history (${res.status}).`);
  }

  const data: { items: HistoryItem[] } = await res.json();
  return data.items;
}
