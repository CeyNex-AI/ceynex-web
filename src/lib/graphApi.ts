import type { GraphFragment } from "../types/contracts";
import { getToken } from "./tokenStorage";

/**
 * GET /api/graph/expand — one hop out from a node the user clicked in the
 * answer's knowledge graph (ceynex/api/routes/graph.py).
 *
 * Same plain-fetch, same-origin shape as queryApi.ts, and the token travels for
 * the same reason: the endpoint answers anonymous callers either way, it just
 * counts them against a per-address allowance rather than a per-user one.
 *
 * A 422 means the node id was not one this graph holds, which is a bug in
 * whatever produced it rather than something the user did — so it throws like
 * any other failure and the panel reports the click didn't work. An unreachable
 * Neo4j is not an error here at all: the backend returns an empty fragment with
 * a 200, and merging nothing into the canvas leaves it exactly as it was.
 */
export async function expandNode(nodeId: string): Promise<GraphFragment> {
  const token = getToken();
  const res = await fetch(`/api/graph/expand?node=${encodeURIComponent(nodeId)}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Expand failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as GraphFragment;
}
